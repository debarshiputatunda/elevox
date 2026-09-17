import asyncio
from datetime import datetime

import httpx
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.telemetry_config import (
    TELEMETRY_CIRCUIT_BREAKER_FAILURES,
    TELEMETRY_OFFLINE_THRESHOLD_S,
    TELEMETRY_POLL_INTERVAL_ACTIVE_S,
    TELEMETRY_POLL_INTERVAL_HIGH_S,
    TELEMETRY_POLL_INTERVAL_IDLE_S,
    TELEMETRY_POLL_INTERVAL_OFFLINE_S,
    TELEMETRY_REGISTRY_SYNC_S,
)
from app.repositories.telemetry_repository import TelemetryRepository
from app.services.notification_engine import notification_engine
from app.telemetry.device_poller import DevicePoller
from app.telemetry.events import BoxMeta
from app.telemetry.health import DeviceHealthMetrics, DevicePollStatus
from app.telemetry.hub import telemetry_hub
from app.utils.datetime_utils import format_iso_utc, utc_now_naive
from app.utils.logger import get_logger
from app.websocket.connection_manager import telemetry_ws_manager

logger = get_logger("telemetry_orchestrator")


class TelemetryOrchestrator:
    def __init__(self):
        self._pollers: dict[int, DevicePoller] = {}
        self._health: dict[int, DeviceHealthMetrics] = {}
        self._high_priority: dict[int, int] = {}
        self._failure_notified_at: dict[int, int] = {}
        self._client: httpx.AsyncClient | None = None
        self._registry_task: asyncio.Task | None = None
        self._heartbeat_task: asyncio.Task | None = None
        self._offline_task: asyncio.Task | None = None
        self._stop_event = asyncio.Event()
        self.last_poll_at: str | None = None

    async def start(self):
        if self._registry_task and not self._registry_task.done():
            return
        self._stop_event.clear()
        self._client = httpx.AsyncClient()
        await telemetry_hub.start()
        telemetry_ws_manager.set_priority_listener(self.recompute_priorities)
        await self._sync_devices()
        self._registry_task = asyncio.create_task(self._registry_loop(), name="telemetry-registry")
        self._heartbeat_task = asyncio.create_task(self._heartbeat_loop(), name="ws-heartbeat")
        self._offline_task = asyncio.create_task(self._offline_loop(), name="telemetry-offline")
        logger.info("Telemetry orchestrator started")

    async def stop(self):
        self._stop_event.set()
        for task in (self._registry_task, self._heartbeat_task, self._offline_task):
            if task is not None:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
        self._registry_task = None
        self._heartbeat_task = None
        self._offline_task = None

        stop_tasks = [poller.stop() for poller in self._pollers.values()]
        if stop_tasks:
            await asyncio.gather(*stop_tasks, return_exceptions=True)
        self._pollers.clear()

        if self._client is not None:
            await self._client.aclose()
            self._client = None
        await telemetry_hub.stop()
        logger.info("Telemetry orchestrator stopped")

    def set_high_priority(self, box_id: int, enabled: bool):
        current = self._high_priority.get(box_id, 0)
        if enabled:
            self._high_priority[box_id] = current + 1
        else:
            next_value = max(current - 1, 0)
            if next_value == 0:
                self._high_priority.pop(box_id, None)
            else:
                self._high_priority[box_id] = next_value
        self._sync_subscriber_metrics(box_id)

    async def recompute_priorities(self):
        counts: dict[int, int] = {}
        async with telemetry_ws_manager._lock:
            for _ws, (_boxes, high_boxes) in telemetry_ws_manager._connections.items():
                for box_id in high_boxes:
                    counts[box_id] = counts.get(box_id, 0) + 1
        self._high_priority = counts
        box_ids = set(self._health.keys()) | set(self._pollers.keys())
        for box_id in box_ids:
            self._sync_subscriber_metrics(box_id)

    def get_health(self, box_id: int) -> DeviceHealthMetrics:
        if box_id not in self._health:
            self._health[box_id] = DeviceHealthMetrics(box_id=box_id)
        return self._health[box_id]

    def get_all_health(self) -> list[dict]:
        return [metrics.to_dict() for metrics in self._health.values()]

    def _sync_subscriber_metrics(self, box_id: int):
        health = self.get_health(box_id)
        health.subscriber_count = telemetry_ws_manager.subscriber_count(box_id)
        health.high_priority_subscribers = self._high_priority.get(box_id, 0)

    def _resolve_interval(self, health: DeviceHealthMetrics) -> float:
        poller = self._pollers.get(health.box_id)
        if health.status == DevicePollStatus.CIRCUIT_OPEN:
            return TELEMETRY_POLL_INTERVAL_OFFLINE_S
        if health.consecutive_failures > 0:
            return TELEMETRY_POLL_INTERVAL_OFFLINE_S
        if health.high_priority_subscribers > 0:
            return TELEMETRY_POLL_INTERVAL_HIGH_S
        if poller and poller.is_recently_active():
            return TELEMETRY_POLL_INTERVAL_ACTIVE_S
        if health.subscriber_count > 0:
            return TELEMETRY_POLL_INTERVAL_ACTIVE_S
        return TELEMETRY_POLL_INTERVAL_IDLE_S

    def _should_notify_failure(self, box_id: int, failures: int) -> bool:
        if failures != 1 and failures % TELEMETRY_CIRCUIT_BREAKER_FAILURES != 0:
            last = self._failure_notified_at.get(box_id, 0)
            if failures - last < TELEMETRY_CIRCUIT_BREAKER_FAILURES:
                return False
        self._failure_notified_at[box_id] = failures
        return True

    async def _registry_loop(self):
        while not self._stop_event.is_set():
            await self._sync_devices()
            await asyncio.sleep(TELEMETRY_REGISTRY_SYNC_S)

    async def _sync_devices(self):
        if self._client is None:
            return
        db: Session = SessionLocal()
        try:
            boxes = TelemetryRepository.get_active_boxes(db)
            active_ids = {box.box_id for box in boxes}
            box_map = {
                box.box_id: BoxMeta(
                    box_id=box.box_id,
                    serial_no=box.serial_no,
                    box_details=box.box_details,
                    box_ip=box.box_ip,
                    hook_a_threshold=box.hookA_threshold if box.hookA_threshold is not None else 50,
                    hook_b_threshold=box.hookB_threshold if box.hookB_threshold is not None else 50,
                )
                for box in boxes
            }
        finally:
            db.close()

        for box_id in list(self._pollers.keys()):
            if box_id not in active_ids:
                await self._pollers[box_id].stop()
                self._pollers.pop(box_id, None)
                self._health.pop(box_id, None)

        for box_id, meta in box_map.items():
            self._sync_subscriber_metrics(box_id)
            existing = self._pollers.get(box_id)
            if existing is not None:
                existing.update_box(meta)
                continue
            poller = DevicePoller(
                meta,
                self._client,
                get_health=self.get_health,
                get_interval=self._resolve_interval,
                should_notify_failure=self._should_notify_failure,
            )
            self._pollers[box_id] = poller
            await poller.start()

        self.last_poll_at = format_iso_utc(utc_now_naive())

    async def _heartbeat_loop(self):
        while not self._stop_event.is_set():
            try:
                await telemetry_ws_manager.send_heartbeat()
            except Exception as exc:
                logger.warning("WebSocket heartbeat failed: %s", exc)
            await asyncio.sleep(30)

    async def _offline_loop(self):
        notified: set[int] = set()
        while not self._stop_event.is_set():
            db: Session = SessionLocal()
            try:
                boxes = TelemetryRepository.get_active_boxes(db)
                now = utc_now_naive()
                for box in boxes:
                    if box.last_seen is None:
                        continue
                    last_seen = box.last_seen
                    if last_seen.tzinfo is not None:
                        last_seen = last_seen.replace(tzinfo=None)
                    elapsed = (now - last_seen).total_seconds()
                    controller_name = box.serial_no or box.box_details or f"Box-{box.box_id}"
                    if elapsed <= TELEMETRY_OFFLINE_THRESHOLD_S:
                        notified.discard(box.box_id)
                        continue
                    if box.box_id in notified:
                        continue
                    await notification_engine.process_online_transition(
                        db,
                        box_id=box.box_id,
                        controller_name=controller_name,
                        is_online=False,
                    )
                    notified.add(box.box_id)
                db.commit()
            except Exception as exc:
                db.rollback()
                logger.exception("Offline check failed: %s", exc)
            finally:
                db.close()
            await asyncio.sleep(TELEMETRY_OFFLINE_THRESHOLD_S)

    @property
    def last_event_at(self) -> str | None:
        return telemetry_hub.last_event_at


telemetry_orchestrator = TelemetryOrchestrator()
