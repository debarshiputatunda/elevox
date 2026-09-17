from datetime import datetime

from sqlalchemy.orm import Session

from app.models.alarm_log import AlarmLog
from app.utils.datetime_utils import utc_now_naive


class AlarmRepository:

    @staticmethod
    def create_log(
        db: Session,
        *,
        box_id: int,
        user_id: int,
        success: bool,
        message: str | None = None,
        triggered_at: datetime | None = None,
    ) -> AlarmLog:
        row = AlarmLog(
            box_id=box_id,
            user_id=user_id,
            success=success,
            message=message,
            triggered_at=triggered_at or utc_now_naive(),
        )
        db.add(row)
        db.flush()
        return row
