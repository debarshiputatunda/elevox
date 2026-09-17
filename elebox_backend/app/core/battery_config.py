BATTERY_HEALTHY_MIN = 51
BATTERY_WARNING_MIN = 20

BATTERY_NOTIFICATION_TYPES = frozenset({
    "LOW_BATTERY",
    "CRITICAL_BATTERY",
    "BATTERY_DISCONNECTED",
    "BATTERY_WARNING",
    "BATTERY_LOW",
})

NOTIFICATIONS_PAGE_TYPES = frozenset({
    "COMMUNICATION_FAILURE",
    "HOOK_THRESHOLD_EXCEEDED",
    "THRESHOLD_EXCEEDED",
    "BUCKLE_OPEN",
    "BUCKLE_OPENED",
    "DEVICE_OFFLINE",
    "DEVICE_ONLINE",
    "CONTROLLER_OFFLINE",
    "CONTROLLER_ONLINE",
    "ALARM_TRIGGERED",
})


def resolve_battery_status(battery_percent: int | None) -> str:
    if battery_percent is None:
        return "Unknown"
    if battery_percent > BATTERY_HEALTHY_MIN:
        return "Healthy"
    if battery_percent >= BATTERY_WARNING_MIN:
        return "Warning"
    return "Critical"
