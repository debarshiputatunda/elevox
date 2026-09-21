from datetime import date, datetime, timezone

import httpx

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.telemetry_config import (
    ACTIVE_ACTIVITY_STATUS_ID,
    TELEMETRY_REQUEST_TIMEOUT_S,
    INACTIVE_ACTIVITY_STATUS_ID,
    TELEMETRY_OFFLINE_THRESHOLD_S,
)
from app.core.rbac import Permission, has_permission
from app.models.box_details import BoxDetail
from app.repositories.role_repository import RoleRepository
from app.repositories.sbox_repository import SboxRepository
from app.utils.datetime_utils import format_iso_utc, utc_now_naive
from app.utils.esp_client import normalize_esp_base_url


class SboxService:

    @staticmethod
    async def update_buckle_alarm(db: Session, box_id: int, enabled: bool):
        box = SboxRepository.get_by_id(db, box_id)
        if box is None:
            raise HTTPException(404, "Elevox not found")
        if not box.box_ip or not box.box_ip.strip():
            raise HTTPException(409, "Elevox has no device address")
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{normalize_esp_base_url(box.box_ip)}/buckle-alarm",
                    data={"enabled": "1" if enabled else "0"},
                    timeout=TELEMETRY_REQUEST_TIMEOUT_S,
                )
                if response.status_code in (404, 405, 501):
                    raise HTTPException(409, "Device firmware does not support buckle alarm control")
                response.raise_for_status()
                saved = response.json()
                # Legacy firmware can return HTTP 200 for unknown paths. Only a
                # strict, durable acknowledgment from the dedicated API counts.
                if (not isinstance(saved, dict) or saved.get("saved") is not True
                        or saved.get("enabled") is not enabled):
                    raise HTTPException(502, "Device did not confirm the saved buckle alarm setting")
        except httpx.RequestError as exc:
            raise HTTPException(503, "Device is unreachable; buckle alarm setting was not confirmed") from exc
        except (httpx.HTTPStatusError, ValueError) as exc:
            raise HTTPException(502, "Device did not confirm the saved buckle alarm setting") from exc
        return {"enabled": enabled, "confirmed": True,
                "confirmed_at": datetime.now(timezone.utc).isoformat()}

    @staticmethod
    def _get_role_names(db: Session, user_id: int) -> set[str]:
        roles = RoleRepository.get_user_roles(db=db, user_id=user_id)
        return {role.role_name for role in roles}

    @staticmethod
    def _is_assigned_only(db: Session, user_id: int, mine: bool) -> bool:
        if not mine:
            return False

        role_names = SboxService._get_role_names(db, user_id)
        return not has_permission(role_names, Permission.SBOXES_MANAGE)

    @staticmethod
    def _generate_serial(db: Session) -> str:
        year = datetime.now(timezone.utc).year
        sequence = SboxRepository.count(db) + 1
        return f"SBOX-{year}-{sequence:04d}"

    @staticmethod
    def _format_timestamp(value: datetime | None) -> str | None:
        return format_iso_utc(value)

    @staticmethod
    def _format_date(value: date | None) -> str | None:
        if value is None:
            return None
        return value.isoformat()

    @staticmethod
    def _is_online(box: BoxDetail) -> bool:
        if box.last_seen is None:
            return False
        now = utc_now_naive()
        last_seen = box.last_seen
        if last_seen.tzinfo is not None:
            last_seen = last_seen.replace(tzinfo=None)
        return (now - last_seen).total_seconds() <= TELEMETRY_OFFLINE_THRESHOLD_S

    @staticmethod
    def _build_response(db: Session, box: BoxDetail):
        is_online = SboxService._is_online(box)
        return {
            "box_id": box.box_id,
            "serial_no": box.serial_no,
            "box_ip": box.box_ip,
            "box_details": box.box_details,
            "location_id": box.location_id,
            "location_name": SboxRepository.get_location_name(db, box.location_id),
            "work_area_id": box.work_area_id,
            "work_area_name": SboxRepository.get_work_area_name(db, box.work_area_id),
            "last_seen": SboxService._format_timestamp(box.last_seen),
            "is_online": is_online,
            "connectivity": "online" if is_online else "offline",
            "activity_status": box.activity_status,
            "activity_status_name": SboxRepository.get_activity_status_name(
                db,
                box.activity_status,
            ),
            "box_health_status": box.box_health_status,
            "box_health_status_name": SboxRepository.get_health_status_name(
                db,
                box.box_health_status,
            ),
            "mfg_date": SboxService._format_date(box.mfg_date),
            "hookA_threshold": box.hookA_threshold,
            "hookB_threshold": box.hookB_threshold,
            "is_assigned": box.is_assigned if box.is_assigned is not None else 0,
        }

    @staticmethod
    def _validate_location_and_work_area(
        db: Session,
        location_id: int,
        work_area_id: int,
    ):
        if SboxRepository.get_location_by_id(db, location_id) is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Location does not exist",
            )

        work_area = SboxRepository.get_work_area_by_id(db, work_area_id)
        if work_area is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Work area does not exist",
            )

        if work_area.location_id != location_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Work area does not belong to the selected location",
            )

    @staticmethod
    def _validate_activity_status(db: Session, activity_status: int):
        if SboxRepository.get_activity_status_name(db, activity_status) is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid activity_status",
            )

    @staticmethod
    def list_sboxes(
        db: Session,
        current_user,
        mine: bool = False,
        search: str | None = None,
    ):
        assigned_only = SboxService._is_assigned_only(
            db,
            current_user.user_id,
            mine,
        )
        boxes = SboxRepository.get_all(
            db,
            user_id=current_user.user_id,
            assigned_only=assigned_only,
        )

        responses = [
            SboxService._build_response(db, box)
            for box in boxes
        ]

        if search:
            query = search.strip().lower()
            responses = [
                item
                for item in responses
                if query in (item["serial_no"] or "").lower()
                or query in (item["box_ip"] or "").lower()
                or query in (item["location_name"] or "").lower()
                or query in (item["work_area_name"] or "").lower()
                or query in (item["box_details"] or "").lower()
            ]

        return responses

    @staticmethod
    def get_sbox(db: Session, box_id: int):
        box = SboxRepository.get_by_id(db, box_id)
        if box is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="S-Box not found",
            )

        return SboxService._build_response(db, box)

    @staticmethod
    def create_sbox(db: Session, request):
        SboxService._validate_location_and_work_area(
            db,
            request.location_id,
            request.work_area_id,
        )
        SboxService._validate_activity_status(db, request.activity_status)

        box_ip = request.box_ip.strip()
        existing_device = SboxRepository.get_by_device_id(db, box_ip)
        if existing_device is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="box_ip already exists",
            )

        serial_no = (
            request.serial_no.strip()
            if request.serial_no
            else SboxService._generate_serial(db)
        )
        existing_serial = SboxRepository.get_by_serial(db, serial_no)
        if existing_serial is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="serial_no already exists",
            )

        healthy_status_id = SboxRepository.get_health_status_id(db, "Healthy")

        box = BoxDetail(
            serial_no=serial_no,
            box_ip=box_ip,
            box_details=request.box_details.strip() if request.box_details else None,
            location_id=request.location_id,
            work_area_id=request.work_area_id,
            activity_status=request.activity_status,
            box_health_status=healthy_status_id,
            mfg_date=request.mfg_date or date.today(),
            hookA_threshold=50,
            hookB_threshold=50,
        )
        try:
            box = SboxRepository.create(db, box)
        except IntegrityError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to register S-Box. Check location, work area, and activity status.",
            )
        return SboxService._build_response(db, box)

    @staticmethod
    def update_sbox(db: Session, box_id: int, request):
        box = SboxRepository.get_by_id(db, box_id)
        if box is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="S-Box not found",
            )

        SboxService._validate_location_and_work_area(
            db,
            request.location_id,
            request.work_area_id,
        )
        SboxService._validate_activity_status(db, request.activity_status)

        box_ip = request.box_ip.strip()
        existing_device = SboxRepository.get_by_device_id(db, box_ip)
        if existing_device is not None and existing_device.box_id != box_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="box_ip already exists",
            )

        box.box_ip = box_ip
        box.box_details = request.box_details.strip() if request.box_details else None
        box.location_id = request.location_id
        box.work_area_id = request.work_area_id
        box.activity_status = request.activity_status
        box.mfg_date = request.mfg_date or box.mfg_date

        try:
            box = SboxRepository.update(db, box)
        except IntegrityError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to update S-Box. Check location, work area, and activity status.",
            )
        return SboxService._build_response(db, box)

    @staticmethod
    def update_thresholds(db: Session, box_id: int, request):
        box = SboxRepository.get_by_id(db, box_id)
        if box is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="S-Box not found",
            )

        if request.hookA_threshold is not None:
            box.hookA_threshold = request.hookA_threshold
        if request.hookB_threshold is not None:
            box.hookB_threshold = request.hookB_threshold
        box = SboxRepository.update(db, box)
        return SboxService._build_response(db, box)

    @staticmethod
    def delete_sbox(db: Session, box_id: int):
        box = SboxRepository.get_by_id(db, box_id)
        if box is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="S-Box not found",
            )

        try:
            SboxRepository.delete(db, box)
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="S-Box cannot be deleted because related records still exist",
            )

        return {"message": "S-Box deleted successfully"}

    @staticmethod
    def set_enabled(db: Session, box_id: int, enabled: bool):
        box = SboxRepository.get_by_id(db, box_id)
        if box is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="S-Box not found",
            )

        next_status = (
            ACTIVE_ACTIVITY_STATUS_ID if enabled else INACTIVE_ACTIVITY_STATUS_ID
        )
        if SboxRepository.get_activity_status_name(db, next_status) is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid activity status configuration",
            )

        box.activity_status = next_status
        box = SboxRepository.update(db, box)
        return SboxService._build_response(db, box)
