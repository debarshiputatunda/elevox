from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum


class DevicePollStatus(str, Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    OFFLINE = "offline"
    CIRCUIT_OPEN = "circuit_open"


@dataclass
class DeviceHealthMetrics:
    box_id: int
    status: DevicePollStatus = DevicePollStatus.HEALTHY
    last_success_at: str | None = None
    last_failure_at: str | None = None
    last_error: str | None = None
    consecutive_failures: int = 0
    reconnect_attempts: int = 0
    response_times_ms: list[float] = field(default_factory=list)
    current_poll_interval_s: float = 1.0
    subscriber_count: int = 0
    high_priority_subscribers: int = 0

    @property
    def average_response_time_ms(self) -> float | None:
        if not self.response_times_ms:
            return None
        return sum(self.response_times_ms) / len(self.response_times_ms)

    def record_success(self, response_time_ms: float, poll_interval_s: float) -> None:
        now = datetime.now(timezone.utc).isoformat()
        self.last_success_at = now
        self.consecutive_failures = 0
        self.reconnect_attempts = 0
        self.last_error = None
        self.current_poll_interval_s = poll_interval_s
        self.response_times_ms.append(response_time_ms)
        if len(self.response_times_ms) > 20:
            self.response_times_ms = self.response_times_ms[-20:]
        if self.status in (DevicePollStatus.OFFLINE, DevicePollStatus.CIRCUIT_OPEN):
            self.status = DevicePollStatus.DEGRADED
        elif self.status == DevicePollStatus.DEGRADED:
            self.status = DevicePollStatus.HEALTHY

    def record_failure(self, error: str, poll_interval_s: float) -> None:
        now = datetime.now(timezone.utc).isoformat()
        self.last_failure_at = now
        self.last_error = error
        self.consecutive_failures += 1
        self.reconnect_attempts += 1
        self.current_poll_interval_s = poll_interval_s
        if self.consecutive_failures >= 5:
            self.status = DevicePollStatus.CIRCUIT_OPEN
        else:
            self.status = DevicePollStatus.OFFLINE

    def to_dict(self) -> dict:
        return {
            "box_id": self.box_id,
            "status": self.status.value,
            "last_success_at": self.last_success_at,
            "last_failure_at": self.last_failure_at,
            "last_error": self.last_error,
            "consecutive_failures": self.consecutive_failures,
            "reconnect_attempts": self.reconnect_attempts,
            "average_response_time_ms": self.average_response_time_ms,
            "current_poll_interval_s": self.current_poll_interval_s,
            "subscriber_count": self.subscriber_count,
            "high_priority_subscribers": self.high_priority_subscribers,
        }
