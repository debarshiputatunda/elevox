import asyncio
import time
from datetime import datetime
from dataclasses import replace

from app.core.database import SessionLocal
from app.repositories.sbox_repository import SboxRepository
from app.utils.threshold_sync import ThresholdSynchronizer
from typing import Callable

import httpx

from app.core.telemetry_config import TELEMETRY_POLL_INTERVAL_OFFLINE_S
from app.telemetry.events import BoxMeta, TelemetryFailureEvent, TelemetrySuccessEvent
from app.telemetry.health import DeviceHealthMetrics
from app.telemetry.hub import telemetry_hub
from app.utils.datetime_utils import utc_now_naive
from app.utils.esp_client import fetch_esp_telemetry
from app.utils.logger import get_logger

logger = get_logger("device_poller")

IntervalResolver = Callable[[DeviceHealthMetrics], float]


class DevicePoller:
    def __init__(
        self,
        box: BoxMeta,
        client: httpx.AsyncClient,
        *,
        get_health: Callable[[int], DeviceHealthMetrics],
        get_interval: IntervalResolver,
        should_notify_failure: Callable[[int, int], bool],
    ):
        self.box = box
        self._threshold_sync = ThresholdSynchronizer()
        self._client = client
        self._get_health = get_health
        self._get_interval = get_interval
        self._should_notify_failure = should_notify_failure
        self._task: asyncio.Task | None = None
        self._stop_event = asyncio.Event()
        self._last_reading_hash: int | None = None
        self._recent_activity_until: float = 0.0

    @property
    def box_id(self) -> int:
        return self.box.box_id

    def update_box(self, box: BoxMeta):
        self.box = box

    async def start(self):
        if self._task and not self._task.done():
            return
        self._stop_event.clear()
        self._task = asyncio.create_task(self._run(), name=f"device-poller-{self.box_id}")

    async def stop(self):
        self._stop_event.set()
        if self._task is not None:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

    def _current_thresholds(self):
        # Registry metadata can lag a save by ten seconds. Never synchronize
        # that stale snapshot back into the device's EEPROM.
        with SessionLocal() as db:
            box = SboxRepository.get_by_id(db, self.box_id)
            if box is None or box.activity_status != 1 or box.box_ip != self.box.box_ip:
                return None
            return (box.hookA_threshold if box.hookA_threshold is not None else 50,
                    box.hookB_threshold if box.hookB_threshold is not None else 50)

    async def _run(self):
        controller_name = self.box.serial_no or self.box.box_details or f"Box-{self.box_id}"
        while not self._stop_event.is_set():
            health = self._get_health(self.box_id)
            interval = self._get_interval(health)
            health.current_poll_interval_s = interval
            started = time.perf_counter()
            try:
                reading = await fetch_esp_telemetry(
                    self._client,
                    self.box.box_ip,
                    box_id=self.box_id,
                )
                if reading.autonomous_hooks:
                    thresholds = await asyncio.to_thread(self._current_thresholds)
                    if thresholds is not None:
                        reading = await self._threshold_sync.reconcile(
                            self._client, self.box.box_ip, reading, *thresholds)
                        self.box = replace(self.box, hook_a_threshold=thresholds[0],
                                           hook_b_threshold=thresholds[1])
                elapsed_ms = (time.perf_counter() - started) * 1000
                now = utc_now_naive()
                reading_sig = hash(
                    (
                        reading.hook_a,
                        reading.hook_b,
                        reading.buckle1,
                        reading.buckle2,
                        reading.buckle3,
                        reading.alarm_active,
                        reading.battery_percent,
                    ),
                )
                if reading_sig != self._last_reading_hash:
                    self._recent_activity_until = time.monotonic() + 30.0
                    self._last_reading_hash = reading_sig

                health.record_success(elapsed_ms, interval)
                await telemetry_hub.publish_success(
                    TelemetrySuccessEvent(
                        box_id=self.box_id,
                        reading=reading,
                        box=self.box,
                        recorded_at=now,
                        response_time_ms=elapsed_ms,
                    ),
                )
            except Exception as exc:
                interval = self._get_interval(health)
                health.record_failure(str(exc), interval)
                failures = health.consecutive_failures
                if self._should_notify_failure(self.box_id, failures):
                    await telemetry_hub.publish_failure(
                        TelemetryFailureEvent(
                            box_id=self.box_id,
                            controller_name=controller_name,
                            error=str(exc),
                            recorded_at=utc_now_naive(),
                            consecutive_failures=failures,
                        ),
                    )
                backoff = min(interval * (2 ** min(failures - 1, 4)), TELEMETRY_POLL_INTERVAL_OFFLINE_S)
                await asyncio.sleep(backoff)
                continue

            await asyncio.sleep(interval)

    def is_recently_active(self) -> bool:
        return time.monotonic() < self._recent_activity_until
