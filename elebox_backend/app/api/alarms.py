from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.rbac import Permission
from app.middlewares.auth_middleware import require_permission
from app.schemas.alarm_schema import AlarmTriggerResponse
from app.services.alarm_service import AlarmService

router = APIRouter(
    prefix="/alarms",
    tags=["Alarms"],
)


@router.post(
    "/{box_id}/trigger",
    response_model=AlarmTriggerResponse,
)
async def trigger_controller_alarm(
    box_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission(Permission.ALARMS)),
):
    return await AlarmService.trigger_alarm(db, box_id, current_user.user_id)
