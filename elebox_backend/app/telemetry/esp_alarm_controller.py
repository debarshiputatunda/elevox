"""Pulse + cooldown ESP alarm scheduler.

Dual-hook violations fire a one-shot ESP `/trigger` pulse (the device plays its
siren for ~10s), identical to the manual "Trigger Alarm" button. While both hooks
remain over threshold, the pulse is repeated only after a configurable cooldown.

Design notes:
- No continuous ON/OFF state and no `/stop` command from this path.
- A per-box cooldown timestamp gates re-fires so `/trigger` is not spammed on
  every telemetry reading.
- A per-box in-flight guard prevents concurrent duplicate `/trigger` calls if
  readings arrive faster than the HTTP request completes.
- ESP communication runs in a background task so the telemetry/notification
  pipeline is never blocked.
"""

from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass

import httpx

from app.core.telemetry_config import DUAL_HOOK_ALARM_COOLDOWN_S
from app.utils.esp_client import trigger_esp_alarm
from app.utils.logger import get_logger

logger = get_logger("esp_alarm_controller")


@dataclass
class _BoxPulseState:
    last_triggered_at: float | None = None
    in_flight: bool = False


class EspAlarmController:
    def __init__(self, cooldown_s: float = DUAL_HOOK_ALARM_COOLDOWN_S):
        self._boxes: dict[int, _BoxPulseState] = {}
        self._lock = asyncio.Lock()
        self._cooldown_s = cooldown_s

    def get_last_triggered_at(self, box_id: int) -> float | None:
        box = self._boxes.get(box_id)
        return None if box is None else box.last_triggered_at

    def _cooldown_active(self, box: _BoxPulseState, now: float) -> bool:
        if box.last_triggered_at is None:
            return False
        return (now - box.last_triggered_at) < self._cooldown_s

    async def request_pulse(
        self,
        box_id: int,
        *,
        box_ip: str,
        on_success=None,
    ) -> bool:
        """Fire a one-shot `/trigger` pulse if eligible.

        Eligible when no pulse is in flight and the cooldown has elapsed since the
        last successful pulse. Returns True if a pulse task was launched.

        `on_success()` is awaited/called only after the ESP `/trigger` succeeds.
        Non-blocking: the HTTP call runs in a background task.
        """
        now = time.monotonic()
        async with self._lock:
            box = self._boxes.get(box_id)
            if box is None:
                box = _BoxPulseState()
                self._boxes[box_id] = box

            if box.in_flight:
                return False
            if self._cooldown_active(box, now):
                return False

            box.in_flight = True

        asyncio.create_task(
            self._run_pulse(box_id, box_ip, on_success),
            name=f"esp-alarm-pulse-{box_id}",
        )
        return True

    async def _run_pulse(self, box_id: int, box_ip: str, on_success) -> None:
        success = False
        try:
            async with httpx.AsyncClient() as client:
                await trigger_esp_alarm(client, box_ip, box_id=box_id)
            success = True
            logger.info(
                "Dual-hook alarm pulse sent | box_id=%s | ip=%s",
                box_id,
                box_ip,
            )
        except Exception as exc:
            logger.error(
                "Dual-hook alarm pulse failed | box_id=%s | ip=%s | error=%s",
                box_id,
                box_ip,
                exc,
            )
        finally:
            async with self._lock:
                box = self._boxes.get(box_id)
                if box is not None:
                    box.in_flight = False
                    # Only start the cooldown clock on a successful pulse so a
                    # failed attempt can retry on the next eligible reading.
                    if success:
                        box.last_triggered_at = time.monotonic()

        if success and on_success is not None:
            try:
                result = on_success()
                if asyncio.iscoroutine(result):
                    await result
            except Exception as exc:
                logger.warning(
                    "Dual-hook alarm on_success callback failed | box_id=%s | %s",
                    box_id,
                    exc,
                )


esp_alarm_controller = EspAlarmController()
