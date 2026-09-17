import asyncio
from datetime import datetime

from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.telemetry_config import TELEMETRY_HISTORY_INTERVAL_S
from app.core.telemetry_config import ACTIVE_ACTIVITY_STATUS_ID
from app.repositories.sbox_repository import SboxRepository
from app.repositories.telemetry_repository import TelemetryRepository
from app.services.notification_engine import notification_engine
from app.telemetry.events import PersistenceEvent, TelemetryFailureEvent, TelemetrySuccessEvent
from app.telemetry.payload import build_ws_payload
from app.utils.datetime_utils import format_iso_utc
from app.utils.logger import get_logger
from app.websocket.connection_manager import telemetry_ws_manager

logger = get_logger("telemetry_hub")


class TelemetryHub:
    def __init__(self):
        self.telemetry_queue: asyncio.Queue = asyncio.Queue(maxsize=10_000)
        self.persistence_queue: asyncio.Queue = asyncio.Queue(maxsize=10_000)
        self.notification_queue: asyncio.Queue = asyncio.Queue(maxsize=10_000)
        self._tasks: list[asyncio.Task] = []
        self._history_last_written: dict[int, float] = {}
        self.last_event_at: str | None = None

    async def start(self):
        if self._tasks:
            return
        self._tasks = [
            asyncio.create_task(self._hub_loop(), name="telemetry-hub"),
            asyncio.create_task(self._persistence_worker(), name="telemetry-persistence"),
            asyncio.create_task(self._notification_worker(), name="telemetry-notifications"),
        ]
        logger.info("Telemetry hub started")

    async def stop(self):
        for task in self._tasks:
            task.cancel()
        for task in self._tasks:
            try:
                await task
            except asyncio.CancelledError:
                pass
        self._tasks.clear()
        logger.info("Telemetry hub stopped")

    async def publish_success(self, event: TelemetrySuccessEvent):
        await self.telemetry_queue.put(event)

    async def publish_failure(self, event: TelemetryFailureEvent):
        await self.notification_queue.put(event)

    async def _hub_loop(self):
        while True:
            event = await self.telemetry_queue.get()
            try:
                if not isinstance(event, TelemetrySuccessEvent):
                    continue
                payload = build_ws_payload(event.box, event.reading, event.recorded_at, online=True)
                await telemetry_ws_manager.broadcast_to_device("telemetry", payload, event.box_id)
                self.last_event_at = format_iso_utc(event.recorded_at)
                await self.persistence_queue.put(
                    PersistenceEvent(
                        kind="snapshot",
                        box_id=event.box_id,
                        reading=event.reading,
                        box=event.box,
                        recorded_at=event.recorded_at,
                    ),
                )
                await self.notification_queue.put(
                    PersistenceEvent(
                        kind="reading",
                        box_id=event.box_id,
                        reading=event.reading,
                        box=event.box,
                        recorded_at=event.recorded_at,
                        controller_name=(
                            event.box.serial_no or event.box.box_details or f"Box-{event.box_id}"
                        ),
                        hook_a_threshold=event.box.hook_a_threshold,
                        hook_b_threshold=event.box.hook_b_threshold,
                    ),
                )
            except Exception as exc:
                logger.exception("Telemetry hub dispatch failed: %s", exc)
            finally:
                self.telemetry_queue.task_done()

    async def _persistence_worker(self):
        while True:
            event = await self.persistence_queue.get()
            try:
                await asyncio.to_thread(self._persist_snapshot, event)
            except Exception as exc:
                logger.exception("Persistence worker failed: %s", exc)
            finally:
                self.persistence_queue.task_done()

    def _persist_snapshot(self, event: PersistenceEvent):
        if event.reading is None or event.recorded_at is None:
            return
        db: Session = SessionLocal()
        try:
            box = SboxRepository.get_by_id(db, event.box_id)
            if box is None:
                return
            TelemetryRepository.upsert_snapshot(db, event.box_id, event.reading, event.recorded_at)
            TelemetryRepository.update_last_seen(db, box, event.recorded_at)
            if self._should_write_history(event.box_id, event.recorded_at.timestamp()):
                TelemetryRepository.insert_history(db, event.box_id, event.reading, event.recorded_at)
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    def _should_write_history(self, box_id: int, timestamp: float) -> bool:
        last = self._history_last_written.get(box_id, 0.0)
        if timestamp - last >= TELEMETRY_HISTORY_INTERVAL_S:
            self._history_last_written[box_id] = timestamp
            return True
        return False

    async def _notification_worker(self):
        while True:
            item = await self.notification_queue.get()
            try:
                if isinstance(item, TelemetryFailureEvent):
                    await self._handle_failure(item)
                elif isinstance(item, PersistenceEvent) and item.kind == "reading":
                    await self._handle_reading(item)
            except Exception as exc:
                logger.exception("Notification worker failed: %s", exc)
            finally:
                self.notification_queue.task_done()

    async def _handle_reading(self, event: PersistenceEvent):
        db: Session = SessionLocal()
        try:
            # Queued readings may predate a threshold edit. Evaluate against the
            # committed configuration, not the poller's older registry snapshot.
            box = SboxRepository.get_by_id(db, event.box_id)
            if box is None or box.activity_status != ACTIVE_ACTIVITY_STATUS_ID:
                return
            await notification_engine.process_reading(
                db,
                box_id=event.box_id,
                controller_name=event.controller_name or f"Box-{event.box_id}",
                reading=event.reading,
                hook_a_threshold=box.hookA_threshold if box.hookA_threshold is not None else 50,
                hook_b_threshold=box.hookB_threshold if box.hookB_threshold is not None else 50,
                box_ip=box.box_ip,
            )
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    async def _handle_failure(self, event: TelemetryFailureEvent):
        db: Session = SessionLocal()
        try:
            await notification_engine.process_communication_failure(
                db,
                box_id=event.box_id,
                controller_name=event.controller_name,
            )
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()


telemetry_hub = TelemetryHub()
