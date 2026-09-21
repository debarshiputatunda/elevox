from datetime import datetime, timezone

from app.telemetry.events import BoxMeta
from app.utils.telemetry_parser import TelemetryReading, raw_hook_to_percent


def build_ws_payload(
    box: BoxMeta,
    reading: TelemetryReading,
    recorded_at: datetime,
    *,
    online: bool = True,
) -> dict:
    controller_name = box.serial_no or box.box_details or f"Box-{box.box_id}"
    ts = recorded_at
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    else:
        ts = ts.astimezone(timezone.utc)

    return {
        "box_id": box.box_id,
        "device_id": box.box_id,
        "controller_name": controller_name,
        "serial_no": box.serial_no,
        "ip_address": box.box_ip,
        "hook_a": reading.hook_a,
        "hook_b": reading.hook_b,
        "hook_a_percent": raw_hook_to_percent(reading.hook_a),
        "hook_b_percent": raw_hook_to_percent(reading.hook_b),
        "battery_percent": reading.battery_percent,
        "battery_voltage": reading.battery_voltage,
        "buckle1": reading.buckle1,
        "buckle2": reading.buckle2,
        "buckle3": reading.buckle3,
        "buckle_alarm_enabled": reading.buckle_alarm_enabled,
        "alarm_active": reading.alarm_active == 1,
        "alarm_cause": reading.alarm_cause,
        "firmware_protocol": reading.protocol,
        "hook_a_valid": reading.hook_a_valid,
        "hook_b_valid": reading.hook_b_valid,
        "threshold_sync": reading.threshold_sync,
        "device_threshold_a": reading.device_threshold_a,
        "device_threshold_b": reading.device_threshold_b,
        "connectivity": "online" if online else "offline",
        "is_online": online,
        "hook_a_threshold": box.hook_a_threshold,
        "hook_b_threshold": box.hook_b_threshold,
        "recorded_at": ts.isoformat(),
    }
