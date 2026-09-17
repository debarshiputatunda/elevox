from datetime import datetime

from sqlalchemy.orm import Session

from app.models.box_log import BoxLog
from app.utils.datetime_utils import utc_now_naive


class BoxLogRepository:

    @staticmethod
    def create(
        db: Session,
        *,
        user_id: int,
        box_id: int,
        work_area_id: int | None,
        description: str,
        created_at: datetime | None = None,
    ) -> BoxLog:
        row = BoxLog(
            user_id=user_id,
            box_id=box_id,
            work_area_id=work_area_id,
            description=description,
            created_at=created_at or utc_now_naive(),
        )
        db.add(row)
        db.flush()
        return row

    @staticmethod
    def list_for_box(
        db: Session,
        box_id: int,
        *,
        offset: int = 0,
        limit: int = 50,
    ):
        query = db.query(BoxLog).filter(BoxLog.box_id == box_id)
        total = query.count()
        rows = (
            query.order_by(BoxLog.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        return rows, total
