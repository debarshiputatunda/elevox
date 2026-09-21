from datetime import datetime

from pydantic import BaseModel, Field


class TelemetrySnapshotResponse(BaseModel):
    box_id: int
    device_id: int
    controller_name: str | None = None
    serial_no: str | None = None
    ip_address: str | None = None
    hook_a: int
    hook_b: int
    hook_a_percent: float
    hook_b_percent: float
    battery_percent: int
    battery_voltage: float
    buckle1: int
    buckle2: int
    buckle3: int
    buckle_alarm_enabled: bool | None = None
    alarm_active: bool
    connectivity: str
    is_online: bool
    hook_a_threshold: int | None = None
    hook_b_threshold: int | None = None
    location_name: str | None = None
    work_area_name: str | None = None
    recorded_at: str


class TelemetryHistoryPoint(BaseModel):
    history_id: int
    box_id: int
    hook_a: int
    hook_b: int
    hook_a_percent: float
    hook_b_percent: float
    battery_percent: int
    battery_voltage: float
    buckle1: int
    buckle2: int
    buckle3: int
    alarm_active: bool
    recorded_at: str


class TelemetryStatisticsResponse(BaseModel):
    box_id: int
    start_at: str
    end_at: str
    sample_count: int
    avg_hook_a: float | None = None
    max_hook_a: int | None = None
    min_hook_a: int | None = None
    avg_hook_b: float | None = None
    max_hook_b: int | None = None
    min_hook_b: int | None = None
    avg_battery_percent: float | None = None
    min_battery_percent: int | None = None


class DeviceHealthSummary(BaseModel):
    box_id: int
    serial_no: str | None = None
    controller_name: str | None = None
    ip_address: str | None = None
    is_online: bool
    connectivity: str
    box_health_status: int | None = None
    box_health_status_name: str | None = None
    last_seen: str | None = None
    battery_percent: int | None = None
    alarm_active: bool | None = None


class MonitoringDashboardSummary(BaseModel):
    total_devices: int
    online_devices: int
    offline_devices: int
    active_alarms: int
    critical_notifications: int
    unread_notifications: int
    last_poll_at: str | None = None

