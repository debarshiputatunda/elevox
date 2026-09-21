import time
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.core.constants import NotificationSeverity, NotificationType
from app.core.telemetry_config import (
    BATTERY_LOW_THRESHOLD,
    DUAL_HOOK_ALARM_COOLDOWN_S,
)
from app.repositories.notification_repository import NotificationRepository
from app.telemetry.esp_alarm_controller import esp_alarm_controller
from app.utils.datetime_utils import format_iso_utc
from app.utils.logger import get_logger
from app.utils.hook_ranges import both_hooks_in_ranges
from app.utils.telemetry_parser import (
    TelemetryReading,
    is_buckle_open,
    is_hook_threshold_exceeded,
)
from app.websocket.connection_manager import telemetry_ws_manager

logger = get_logger("notification_engine")


@dataclass
class BoxNotificationState:
    online: bool = False
    battery_low: bool = False
    # Last ESP-reported alarm flag from /data (telemetry only — not dual-hook command state).
    esp_reported_alarm: bool = False
    hook_a_exceeded: bool = False
    hook_b_exceeded: bool = False
    # True while both hooks are over threshold (dual-hook violation).
    dual_hook_violation: bool = False
    buckle_open: bool = False
    communication_failure: bool = False


class NotificationEngine:
    def __init__(self):
        self._states: dict[int, BoxNotificationState] = {}

    def _get_state(self, box_id: int) -> BoxNotificationState:
        if box_id not in self._states:
            self._states[box_id] = BoxNotificationState()
        return self._states[box_id]

    def _emit(
        self,
        db: Session,
        *,
        box_id: int,
        controller_name: str,
        severity: str,
        title: str,
        message: str,
        notification_type: str,
    ):
        row = NotificationRepository.create(
            db,
            box_id=box_id,
            severity=severity,
            title=title,
            message=message,
            notification_type=notification_type,
        )
        payload = {
            "id": row.notification_id,
            "device_id": box_id,
            "controller_name": controller_name,
            "severity": severity,
            "title": title,
            "message": message,
            "notification_type": notification_type,
            "timestamp": format_iso_utc(row.created_at),
            "is_read": False,
        }
        return payload

    async def process_online_transition(
        self,
        db: Session,
        *,
        box_id: int,
        controller_name: str,
        is_online: bool,
    ):
        state = self._get_state(box_id)
        if is_online and not state.online:
            state.online = True
            state.communication_failure = False
            payload = self._emit(
                db,
                box_id=box_id,
                controller_name=controller_name,
                severity=NotificationSeverity.INFO,
                title="Controller Online",
                message=f"{controller_name} is back online.",
                notification_type=NotificationType.CONTROLLER_ONLINE,
            )
            await telemetry_ws_manager.broadcast_to_all("notification", payload)
        elif not is_online and state.online:
            state.online = False
            payload = self._emit(
                db,
                box_id=box_id,
                controller_name=controller_name,
                severity=NotificationSeverity.WARNING,
                title="Controller Offline",
                message=f"{controller_name} lost connectivity.",
                notification_type=NotificationType.CONTROLLER_OFFLINE,
            )
            await telemetry_ws_manager.broadcast_to_all("notification", payload)

    async def process_communication_failure(
        self,
        db: Session,
        *,
        box_id: int,
        controller_name: str,
    ):
        state = self._get_state(box_id)
        if state.communication_failure:
            return
        state.communication_failure = True
        state.online = False
        payload = self._emit(
            db,
            box_id=box_id,
            controller_name=controller_name,
            severity=NotificationSeverity.CRITICAL,
            title="Communication Failure",
            message=f"Failed to communicate with {controller_name}.",
            notification_type=NotificationType.COMMUNICATION_FAILURE,
        )
        await telemetry_ws_manager.broadcast_to_all("notification", payload)

    async def process_reading(
        self,
        db: Session,
        *,
        box_id: int,
        controller_name: str,
        reading: TelemetryReading,
        hook_a_threshold: int,
        hook_b_threshold: int,
        box_ip: str | None = None,
    ):
        state = self._get_state(box_id)
        state.communication_failure = False

        if not state.online:
            state.online = True
            payload = self._emit(
                db,
                box_id=box_id,
                controller_name=controller_name,
                severity=NotificationSeverity.INFO,
                title="Controller Online",
                message=f"{controller_name} is online.",
                notification_type=NotificationType.CONTROLLER_ONLINE,
            )
            await telemetry_ws_manager.broadcast_to_all("notification", payload)

        battery_low = reading.battery_percent < BATTERY_LOW_THRESHOLD
        if battery_low and not state.battery_low:
            state.battery_low = True
            payload = self._emit(
                db,
                box_id=box_id,
                controller_name=controller_name,
                severity=NotificationSeverity.WARNING,
                title="Battery Low",
                message=(
                    f"{controller_name} battery is low "
                    f"({reading.battery_percent}%, {reading.battery_voltage}V)."
                ),
                notification_type=NotificationType.BATTERY_LOW,
            )
            await telemetry_ws_manager.broadcast_to_all("notification", payload)
        elif not battery_low:
            state.battery_low = False

        esp_reported_alarm = reading.alarm_active == 1 and not (
            reading.buckle_alarm_enabled is False and reading.alarm_cause == "BUCKLE"
        )
        if esp_reported_alarm and not state.esp_reported_alarm:
            state.esp_reported_alarm = True
            # Suppress when we just auto-pulsed the alarm ourselves (the pulse path
            # emits its own ALARM_TRIGGERED), avoiding a duplicate notification for
            # the same physical activation.
            last_pulse = esp_alarm_controller.get_last_triggered_at(box_id)
            recently_auto_pulsed = (
                last_pulse is not None
                and (time.monotonic() - last_pulse) < DUAL_HOOK_ALARM_COOLDOWN_S
            )
            if not recently_auto_pulsed:
                payload = self._emit(
                    db,
                    box_id=box_id,
                    controller_name=controller_name,
                    severity=NotificationSeverity.CRITICAL,
                    title="Alarm Triggered",
                    message=f"Physical alarm activated on {controller_name}.",
                    notification_type=NotificationType.ALARM_TRIGGERED,
                )
                await telemetry_ws_manager.broadcast_to_all("notification", payload)
        elif not esp_reported_alarm:
            state.esp_reported_alarm = False

        if reading.hook_alarm_ranges is not None:
            violation = both_hooks_in_ranges(reading)
            if violation and not state.dual_hook_violation:
                payload = self._emit(
                    db, box_id=box_id, controller_name=controller_name,
                    severity=NotificationSeverity.CRITICAL, title="Hook Alarm Ranges Matched",
                    message=f"Both hooks are inside their alarm ranges on {controller_name}.",
                    notification_type=NotificationType.THRESHOLD_EXCEEDED)
                await telemetry_ws_manager.broadcast_to_all("notification", payload)
            state.dual_hook_violation = violation
            state.hook_a_exceeded = state.hook_b_exceeded = False
        else:
            hook_a_exceeded = is_hook_threshold_exceeded(reading.hook_a, hook_a_threshold)
            if hook_a_exceeded and not state.hook_a_exceeded:
                state.hook_a_exceeded = True
                payload = self._emit(
                    db,
                    box_id=box_id,
                    controller_name=controller_name,
                    severity=NotificationSeverity.CRITICAL,
                    title="Hook A Threshold Exceeded",
                    message=f"Hook A threshold exceeded on {controller_name}.",
                    notification_type=NotificationType.THRESHOLD_EXCEEDED,
                )
                await telemetry_ws_manager.broadcast_to_all("notification", payload)
            elif not hook_a_exceeded:
                state.hook_a_exceeded = False

            hook_b_exceeded = is_hook_threshold_exceeded(reading.hook_b, hook_b_threshold)
            if hook_b_exceeded and not state.hook_b_exceeded:
                state.hook_b_exceeded = True
                payload = self._emit(
                    db,
                    box_id=box_id,
                    controller_name=controller_name,
                    severity=NotificationSeverity.CRITICAL,
                    title="Hook B Threshold Exceeded",
                    message=f"Hook B threshold exceeded on {controller_name}.",
                    notification_type=NotificationType.THRESHOLD_EXCEEDED,
                )
                await telemetry_ws_manager.broadcast_to_all("notification", payload)
            elif not hook_b_exceeded:
                state.hook_b_exceeded = False

            # Integrated v5 enforces persisted thresholds locally. A server pulse
            # would latch for ten seconds even after the local condition clears.
            if not reading.autonomous_hooks:
                await self._sync_dual_hook_alarm(
                    db,
                    box_id=box_id,
                    controller_name=controller_name,
                    box_ip=box_ip,
                    hook_a_exceeded=hook_a_exceeded,
                    hook_b_exceeded=hook_b_exceeded,
                    state=state,
                )

        buckle_open = reading.buckle_alarm_enabled is not False and any(
            is_buckle_open(value)
            for value in (reading.buckle1, reading.buckle2, reading.buckle3)
        )
        if buckle_open and not state.buckle_open:
            state.buckle_open = True
            payload = self._emit(
                db,
                box_id=box_id,
                controller_name=controller_name,
                severity=NotificationSeverity.WARNING,
                title="Buckle Opened",
                message=f"One or more buckles opened on {controller_name}.",
                notification_type=NotificationType.BUCKLE_OPENED,
            )
            await telemetry_ws_manager.broadcast_to_all("notification", payload)
        elif not buckle_open:
            state.buckle_open = False

    async def _sync_dual_hook_alarm(
        self,
        _db: Session,
        *,
        box_id: int,
        controller_name: str,
        box_ip: str | None,
        hook_a_exceeded: bool,
        hook_b_exceeded: bool,
        state: BoxNotificationState,
    ):
        """Pulse the ESP `/trigger` while both hooks are over threshold.

        Fires a one-shot siren pulse (same path as the manual button); the pulse
        controller enforces a cooldown so it only re-fires after the configured
        interval if both hooks are still exceeded. No OFF/clear command is sent.
        """
        violation = hook_a_exceeded and hook_b_exceeded
        state.dual_hook_violation = violation

        if not violation:
            return

        if not box_ip:
            logger.warning(
                "Dual-hook alarm pulse skipped | box_id=%s | reason=missing box_ip",
                box_id,
            )
            return

        async def on_success():
            # Pulse task outlives the reading's DB session — open a fresh one.
            from app.core.database import SessionLocal

            notify_db: Session = SessionLocal()
            try:
                payload = self._emit(
                    notify_db,
                    box_id=box_id,
                    controller_name=controller_name,
                    severity=NotificationSeverity.CRITICAL,
                    title="Alarm Triggered",
                    message=(
                        f"Physical alarm pulsed on {controller_name} "
                        f"(Hook A and Hook B both over threshold)."
                    ),
                    notification_type=NotificationType.ALARM_TRIGGERED,
                )
                notify_db.commit()
                await telemetry_ws_manager.broadcast_to_all("notification", payload)
            except Exception:
                notify_db.rollback()
                raise
            finally:
                notify_db.close()

        # Non-blocking: launches a background /trigger pulse only if not in flight
        # and the cooldown has elapsed since the last successful pulse.
        await esp_alarm_controller.request_pulse(
            box_id,
            box_ip=box_ip,
            on_success=on_success,
        )


notification_engine = NotificationEngine()
