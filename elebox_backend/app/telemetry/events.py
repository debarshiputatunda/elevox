from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

from app.utils.telemetry_parser import TelemetryReading


class PollPriority(str, Enum):
    HIGH = "high"
    ACTIVE = "active"
    NORMAL = "normal"
    OFFLINE = "offline"


@dataclass(frozen=True)
class BoxMeta:
    box_id: int
    serial_no: str | None
    box_details: str | None
    box_ip: str
    hook_a_threshold: int
    hook_b_threshold: int


@dataclass
class TelemetrySuccessEvent:
    box_id: int
    reading: TelemetryReading
    box: BoxMeta
    recorded_at: datetime
    response_time_ms: float


@dataclass
class TelemetryFailureEvent:
    box_id: int
    controller_name: str
    error: str
    recorded_at: datetime
    consecutive_failures: int


@dataclass
class PersistenceEvent:
    kind: str
    box_id: int
    reading: TelemetryReading | None = None
    box: BoxMeta | None = None
    recorded_at: datetime | None = None
    controller_name: str | None = None
    hook_a_threshold: int = 50
    hook_b_threshold: int = 50
    is_failure: bool = False
    extra: dict = field(default_factory=dict)
