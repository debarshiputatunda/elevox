import os

from dotenv import load_dotenv

load_dotenv()


def _float_env(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    return float(raw)


def _int_env(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    return int(raw)


TELEMETRY_POLL_INTERVAL_S = _float_env("TELEMETRY_POLL_INTERVAL_S", 0.15)
TELEMETRY_POLL_INTERVAL_HIGH_S = _float_env("TELEMETRY_POLL_INTERVAL_HIGH_S", 0.15)
TELEMETRY_POLL_INTERVAL_ACTIVE_S = _float_env("TELEMETRY_POLL_INTERVAL_ACTIVE_S", 0.25)
TELEMETRY_POLL_INTERVAL_IDLE_S = _float_env("TELEMETRY_POLL_INTERVAL_IDLE_S", 1.0)
TELEMETRY_POLL_INTERVAL_OFFLINE_S = _float_env("TELEMETRY_POLL_INTERVAL_OFFLINE_S", 5.0)
TELEMETRY_REGISTRY_SYNC_S = _float_env("TELEMETRY_REGISTRY_SYNC_S", 10.0)
TELEMETRY_CIRCUIT_BREAKER_FAILURES = _int_env("TELEMETRY_CIRCUIT_BREAKER_FAILURES", 5)
TELEMETRY_REQUEST_TIMEOUT_S = _float_env("TELEMETRY_REQUEST_TIMEOUT_S", 1.5)
TELEMETRY_MAX_CONCURRENT_POLLS = _int_env("TELEMETRY_MAX_CONCURRENT_POLLS", 50)
TELEMETRY_OFFLINE_THRESHOLD_S = _int_env("TELEMETRY_OFFLINE_THRESHOLD_S", 10)
TELEMETRY_HISTORY_INTERVAL_S = _float_env("TELEMETRY_HISTORY_INTERVAL_S", 10.0)
TELEMETRY_MAX_RETRIES = _int_env("TELEMETRY_MAX_RETRIES", 2)
TELEMETRY_RETRY_DELAY_S = _float_env("TELEMETRY_RETRY_DELAY_S", 0.25)

BATTERY_LOW_THRESHOLD = _int_env("BATTERY_LOW_THRESHOLD", 20)

ESP_FINE_MIN = _int_env("ESP_HOOK_FINE_MIN", 2500)
ESP_FINE_MAX = _int_env("ESP_HOOK_FINE_MAX", 4500)

# Alarm control. GET /trigger fires a one-shot siren pulse (device plays ~10s);
# GET /stop clears it (used by the manual/legacy OFF helper only).
ESP_ALARM_ON_PATH = os.getenv("ESP_ALARM_ON_PATH", "/trigger").strip() or "/trigger"
ESP_ALARM_OFF_PATH = os.getenv("ESP_ALARM_OFF_PATH", "/stop").strip() or "/stop"

# Auto dual-hook alarm: after a /trigger pulse, wait this long before re-checking
# and pulsing again while both hooks remain over threshold.
DUAL_HOOK_ALARM_COOLDOWN_S = _float_env("DUAL_HOOK_ALARM_COOLDOWN_S", 10.0)

ACTIVE_ACTIVITY_STATUS_ID = _int_env("ACTIVE_ACTIVITY_STATUS_ID", 1)
INACTIVE_ACTIVITY_STATUS_ID = _int_env("INACTIVE_ACTIVITY_STATUS_ID", 2)
