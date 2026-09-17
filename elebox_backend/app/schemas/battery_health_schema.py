from pydantic import BaseModel, Field


class BatteryDeviceFilters(BaseModel):
    box_id: int | None = None
    location_id: int | None = None
    work_area_id: int | None = None
    battery_status: str | None = None


class BatteryHealthSummaryResponse(BaseModel):
    total_devices: int
    healthy_count: int
    warning_count: int
    critical_count: int
    unknown_count: int
    average_battery_percent: float


class BatteryDeviceResponse(BaseModel):
    box_id: int
    serial_no: str | None = None
    location_id: int | None = None
    location_name: str | None = None
    work_area_id: int | None = None
    work_area_name: str | None = None
    battery_percent: int | None = None
    battery_voltage: float | None = None
    battery_status: str
    last_seen: str | None = None
    last_updated: str | None = None


class BatteryDeviceListResponse(BaseModel):
    data: list[BatteryDeviceResponse]
    total: int
    page: int
    page_size: int


class BatteryDistributionItem(BaseModel):
    status: str
    count: int


class BatteryLowestItem(BaseModel):
    box_id: int
    serial_no: str | None = None
    battery_percent: int


class BatteryTrendPoint(BaseModel):
    recorded_at: str
    battery_percent: int
    battery_voltage: float


class BatteryAnalyticsResponse(BaseModel):
    distribution: list[BatteryDistributionItem]
    lowest_devices: list[BatteryLowestItem]
    trend: list[BatteryTrendPoint] = Field(default_factory=list)
