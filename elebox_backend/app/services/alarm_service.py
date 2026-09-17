import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories.alarm_repository import AlarmRepository
from app.repositories.sbox_repository import SboxRepository
from app.utils.datetime_utils import format_iso_utc, utc_now_naive
from app.utils.esp_client import trigger_esp_alarm
from app.utils.logger import get_logger

logger = get_logger("alarm_service")


class AlarmService:

    @staticmethod
    async def trigger_alarm(db: Session, box_id: int, user_id: int):
        box = SboxRepository.get_by_id(db, box_id)
        if box is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="S-Box not found")
        if not box.box_ip:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Controller IP address is not configured",
            )

        triggered_at = utc_now_naive()
        success = False
        message = "Alarm triggered successfully"

        try:
            async with httpx.AsyncClient() as client:
                await trigger_esp_alarm(client, box.box_ip, box_id=box.box_id)
            success = True
            logger.info(
                "Alarm triggered | box_id=%s | user_id=%s | ip=%s",
                box_id,
                user_id,
                box.box_ip,
            )
        except Exception as exc:
            message = f"Alarm trigger failed: {exc}"
            logger.error(
                "Alarm trigger failed | box_id=%s | user_id=%s | error=%s",
                box_id,
                user_id,
                exc,
            )

        AlarmRepository.create_log(
            db,
            box_id=box_id,
            user_id=user_id,
            success=success,
            message=message,
            triggered_at=triggered_at,
        )
        db.commit()

        if not success:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=message)

        return {
            "box_id": box_id,
            "success": success,
            "message": message,
            "triggered_at": format_iso_utc(triggered_at),
        }
