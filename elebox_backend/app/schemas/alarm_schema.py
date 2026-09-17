from pydantic import BaseModel


class AlarmTriggerResponse(BaseModel):
    box_id: int
    success: bool
    message: str
    triggered_at: str
