from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.telemetry_config import ACTIVE_ACTIVITY_STATUS_ID
from app.models.box_details import BoxDetail
from app.models.locations import Location
from app.models.users import User
from app.models.work_areas import WorkArea
from app.repositories.import_repository import ImportRepository
from app.repositories.sbox_repository import SboxRepository
from app.schemas.import_schema import ImportErrorDetail, ImportResponse
from app.utils.excel_parser import ParsedSheet, build_template_workbook, parse_excel_sheet
from app.utils.logger import get_logger
from app.utils.password_handler import hash_password

logger = get_logger("import_service")

DEFAULT_BOX_HEALTH_STATUS_ID = 1

LOCATION_HEADERS = {
    "country_id": ("Country ID", "country id", "country_id"),
    "city_id": ("City ID", "city id", "city_id"),
    "location_name": ("Location Name", "location name", "location_name"),
}

WORK_AREA_HEADERS = {
    "work_area_name": ("Work Area Name", "work area name", "work_area_name"),
    "location_id": ("Location ID", "location id", "location_id"),
}

USER_HEADERS = {
    "employee_id": ("Employee ID", "employee id", "employee_id"),
    "employee_name": ("Employee Name", "employee name", "employee_name"),
    "status_id": ("Status ID", "status id", "status_id"),
    "job_title_id": ("Job Title ID", "job title id", "job_title_id"),
    "email_id": ("Email", "email", "email id", "email_id"),
    "phonenumber": ("Phone Number", "phone number", "phonenumber", "phone"),
    "work_area_id": ("Work Area ID", "work area id", "work_area_id"),
    "location_id": ("Location ID", "location id", "location_id"),
    "password": ("Password", "password"),
}

SBOX_REQUIRED_HEADERS = {
    "box_ip": ("Box IP", "box ip", "box_ip"),
    "box_details": ("Box Details", "box details", "box_details"),
    "location_id": ("Location ID", "location id", "location_id"),
    "work_area_id": ("Work Area ID", "work area id", "work_area_id"),
    "mfg_date": ("Manufacturing Date", "manufacturing date", "mfg_date", "mfg date"),
    "hookA_threshold": ("Hook A Threshold", "hook a threshold", "hookA_threshold"),
    "hookB_threshold": ("Hook B Threshold", "hook b threshold", "hookB_threshold"),
}

SBOX_OPTIONAL_HEADERS = {
    "serial_no": ("Serial Number", "serial number", "serial_no"),
}

TEMPLATE_HEADERS = {
    "locations": ["Country ID", "City ID", "Location Name"],
    "work-areas": ["Work Area Name", "Location ID"],
    "users": [
        "Employee ID",
        "Employee Name",
        "Status ID",
        "Job Title ID",
        "Email",
        "Phone Number",
        "Work Area ID",
        "Location ID",
        "Password",
    ],
    "sboxes": [
        "Serial Number",
        "Box IP",
        "Box Details",
        "Location ID",
        "Work Area ID",
        "Manufacturing Date",
        "Hook A Threshold",
        "Hook B Threshold",
    ],
}


@dataclass
class _ImportBuildResult:
    total_rows: int
    errors: list[ImportErrorDetail] = field(default_factory=list)
    valid_records: list[Any] = field(default_factory=list)


class ImportService:

    @staticmethod
    def get_template(import_type: str) -> tuple[bytes, str]:
        headers = TEMPLATE_HEADERS.get(import_type)
        if headers is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Unknown import template type",
            )
        content = build_template_workbook(headers)
        filename = f"{import_type.replace('-', '_')}_import_template.xlsx"
        return content, filename

    @staticmethod
    def _parse_file(
        file_bytes: bytes,
        header_map: dict,
        *,
        optional_headers: dict | None = None,
    ) -> ParsedSheet:
        try:
            return parse_excel_sheet(
                file_bytes,
                required_headers=header_map,
                optional_headers=optional_headers,
            )
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            ) from exc

    @staticmethod
    def _to_int(value: Any, field_label: str) -> int:
        if value is None or str(value).strip() == "":
            raise ValueError(f"{field_label} is required")
        try:
            if isinstance(value, float) and value.is_integer():
                return int(value)
            return int(str(value).strip())
        except (TypeError, ValueError) as exc:
            raise ValueError(f"{field_label} must be a valid integer") from exc

    @staticmethod
    def _to_optional_int(value: Any) -> int | None:
        if value is None or str(value).strip() == "":
            return None
        if isinstance(value, float) and value.is_integer():
            return int(value)
        return int(str(value).strip())

    @staticmethod
    def _next_import_serial(
        existing_serials: set[str],
        seen_serials: set[str],
        next_seq: list[int],
    ) -> str:
        year = datetime.now(timezone.utc).year
        while True:
            candidate = f"SBOX-{year}-{next_seq[0]:04d}"
            next_seq[0] += 1
            if candidate not in existing_serials and candidate not in seen_serials:
                return candidate

    @staticmethod
    def _to_str(value: Any, field_label: str, *, required: bool = True) -> str:
        if value is None or str(value).strip() == "":
            if required:
                raise ValueError(f"{field_label} is required")
            return ""
        return str(value).strip()

    @staticmethod
    def _parse_date(value: Any, field_label: str) -> date | None:
        if value is None or str(value).strip() == "":
            return None
        if isinstance(value, datetime):
            return value.date()
        if isinstance(value, date):
            return value
        text = str(value).strip()
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y"):
            try:
                return datetime.strptime(text, fmt).date()
            except ValueError:
                continue
        raise ValueError(f"{field_label} must be a valid date (YYYY-MM-DD)")

    @staticmethod
    def _finalize(
        db: Session,
        *,
        import_type: str,
        user_id: int | None,
        file_name: str | None,
        build_result: _ImportBuildResult,
    ) -> ImportResponse:
        success_rows = 0
        if build_result.valid_records:
            try:
                if import_type == "locations":
                    success_rows = ImportRepository.bulk_insert_locations(
                        db, build_result.valid_records
                    )
                elif import_type == "work-areas":
                    success_rows = ImportRepository.bulk_insert_work_areas(
                        db, build_result.valid_records
                    )
                elif import_type == "users":
                    success_rows = ImportRepository.bulk_insert_users(
                        db, build_result.valid_records
                    )
                elif import_type == "sboxes":
                    success_rows = ImportRepository.bulk_insert_sboxes(
                        db, build_result.valid_records
                    )
                db.commit()
            except SQLAlchemyError as exc:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Bulk insert failed: {exc}",
                ) from exc
        else:
            db.commit()

        import_id: int | None = None
        try:
            history = ImportRepository.log_import(
                db,
                import_type=import_type,
                user_id=user_id,
                file_name=file_name,
                total_rows=build_result.total_rows,
                success_rows=success_rows,
                failed_rows=len(build_result.errors),
            )
            db.commit()
            import_id = history.import_id
        except SQLAlchemyError as exc:
            db.rollback()
            logger.warning(
                "Import history logging failed (run migrations/002_import_history.sql): %s",
                exc,
            )

        return ImportResponse(
            total_rows=build_result.total_rows,
            success_rows=success_rows,
            failed_rows=len(build_result.errors),
            errors=build_result.errors,
            import_id=import_id,
        )

    @staticmethod
    def import_locations(
        db: Session,
        file_bytes: bytes,
        *,
        file_name: str | None,
        user_id: int | None,
    ) -> ImportResponse:
        sheet = ImportService._parse_file(file_bytes, LOCATION_HEADERS)
        country_ids = ImportRepository.get_existing_country_ids(db)
        city_ids = ImportRepository.get_existing_city_ids(db)
        existing_names = ImportRepository.get_existing_location_names(db)
        seen_names: set[str] = set()

        result = _ImportBuildResult(total_rows=len(sheet.rows))

        for row_data, row_number in zip(sheet.rows, sheet.row_numbers):
            messages: list[str] = []
            try:
                country_id = ImportService._to_int(row_data.get("country_id"), "Country ID")
                city_id = ImportService._to_int(row_data.get("city_id"), "City ID")
                location_name = ImportService._to_str(
                    row_data.get("location_name"), "Location Name"
                )

                if country_id not in country_ids:
                    messages.append("Country ID does not exist")
                if city_id not in city_ids:
                    messages.append("City ID does not exist")

                normalized_name = location_name.lower()
                if normalized_name in existing_names:
                    messages.append("Location name already exists")
                if normalized_name in seen_names:
                    messages.append("Duplicate location name in import file")
                else:
                    seen_names.add(normalized_name)

                if messages:
                    result.errors.append(
                        ImportErrorDetail(
                            row=row_number,
                            message="; ".join(dict.fromkeys(messages)),
                        )
                    )
                    continue

                result.valid_records.append(
                    Location(
                        country_id=country_id,
                        city_id=city_id,
                        location_name=location_name,
                    )
                )
                existing_names.add(normalized_name)
            except ValueError as exc:
                result.errors.append(ImportErrorDetail(row=row_number, message=str(exc)))

        return ImportService._finalize(
            db,
            import_type="locations",
            user_id=user_id,
            file_name=file_name,
            build_result=result,
        )

    @staticmethod
    def import_work_areas(
        db: Session,
        file_bytes: bytes,
        *,
        file_name: str | None,
        user_id: int | None,
    ) -> ImportResponse:
        sheet = ImportService._parse_file(file_bytes, WORK_AREA_HEADERS)
        location_ids = ImportRepository.get_existing_location_ids(db)
        existing_keys = ImportRepository.get_work_area_keys(db)
        seen_keys: set[tuple[int, str]] = set()

        result = _ImportBuildResult(total_rows=len(sheet.rows))

        for row_data, row_number in zip(sheet.rows, sheet.row_numbers):
            messages: list[str] = []
            try:
                work_area_name = ImportService._to_str(
                    row_data.get("work_area_name"), "Work Area Name"
                )
                location_id = ImportService._to_int(
                    row_data.get("location_id"), "Location ID"
                )

                if location_id not in location_ids:
                    messages.append("Location ID does not exist")

                key = (location_id, work_area_name.lower())
                if key in existing_keys:
                    messages.append(
                        "Work area name already exists for this location"
                    )
                if key in seen_keys:
                    messages.append(
                        "Duplicate work area name for location in import file"
                    )
                else:
                    seen_keys.add(key)

                if messages:
                    result.errors.append(
                        ImportErrorDetail(
                            row=row_number,
                            message="; ".join(dict.fromkeys(messages)),
                        )
                    )
                    continue

                result.valid_records.append(
                    WorkArea(
                        work_area_name=work_area_name,
                        location_id=location_id,
                    )
                )
                existing_keys.add(key)
            except ValueError as exc:
                result.errors.append(ImportErrorDetail(row=row_number, message=str(exc)))

        return ImportService._finalize(
            db,
            import_type="work-areas",
            user_id=user_id,
            file_name=file_name,
            build_result=result,
        )

    @staticmethod
    def import_users(
        db: Session,
        file_bytes: bytes,
        *,
        file_name: str | None,
        user_id: int | None,
    ) -> ImportResponse:
        sheet = ImportService._parse_file(file_bytes, USER_HEADERS)
        status_ids = ImportRepository.get_existing_status_ids(db)
        job_title_ids = ImportRepository.get_existing_job_title_ids(db)
        location_ids = ImportRepository.get_existing_location_ids(db)
        work_area_map = ImportRepository.get_work_area_location_map(db)
        existing_employee_ids = ImportRepository.get_existing_employee_ids(db)
        existing_emails = ImportRepository.get_existing_emails(db)
        existing_phones = ImportRepository.get_existing_phone_numbers(db)

        seen_employee_ids: set[str] = set()
        seen_emails: set[str] = set()
        seen_phones: set[str] = set()

        result = _ImportBuildResult(total_rows=len(sheet.rows))

        for row_data, row_number in zip(sheet.rows, sheet.row_numbers):
            messages: list[str] = []
            try:
                employee_id = ImportService._to_str(
                    row_data.get("employee_id"), "Employee ID"
                )
                employee_name = ImportService._to_str(
                    row_data.get("employee_name"), "Employee Name"
                )
                status_id = ImportService._to_int(row_data.get("status_id"), "Status ID")
                job_title_id = ImportService._to_int(
                    row_data.get("job_title_id"), "Job Title ID"
                )
                email = ImportService._to_str(row_data.get("email_id"), "Email")
                phone = ImportService._to_str(
                    row_data.get("phonenumber"), "Phone Number"
                )
                work_area_id = ImportService._to_int(
                    row_data.get("work_area_id"), "Work Area ID"
                )
                location_id = ImportService._to_int(
                    row_data.get("location_id"), "Location ID"
                )
                password = ImportService._to_str(row_data.get("password"), "Password")

                if status_id not in status_ids:
                    messages.append("Status ID does not exist")
                if job_title_id not in job_title_ids:
                    messages.append("Job Title ID does not exist")
                if location_id not in location_ids:
                    messages.append("Location ID does not exist")
                if work_area_id not in work_area_map:
                    messages.append("Work Area ID does not exist")
                elif work_area_map[work_area_id] != location_id:
                    messages.append("Work Area does not belong to the specified Location")

                email_key = email.lower()
                if employee_id in existing_employee_ids:
                    messages.append("Employee ID already exists")
                if employee_id in seen_employee_ids:
                    messages.append("Duplicate Employee ID in import file")
                else:
                    seen_employee_ids.add(employee_id)

                if email_key in existing_emails:
                    messages.append("Email already exists")
                if email_key in seen_emails:
                    messages.append("Duplicate Email in import file")
                else:
                    seen_emails.add(email_key)

                if phone in existing_phones:
                    messages.append("Phone number already exists")
                if phone in seen_phones:
                    messages.append("Duplicate phone number in import file")
                else:
                    seen_phones.add(phone)

                if len(password) < 6:
                    messages.append("Password must be at least 6 characters")

                if messages:
                    result.errors.append(
                        ImportErrorDetail(
                            row=row_number,
                            message="; ".join(dict.fromkeys(messages)),
                        )
                    )
                    continue

                result.valid_records.append(
                    User(
                        employee_id=employee_id,
                        employee_name=employee_name,
                        status_id=status_id,
                        job_title_id=job_title_id,
                        email_id=email,
                        phonenumber=phone,
                        work_area_id=work_area_id,
                        location_id=location_id,
                        photo=None,
                        password=hash_password(password),
                    )
                )
                existing_employee_ids.add(employee_id)
                existing_emails.add(email_key)
                existing_phones.add(phone)
            except ValueError as exc:
                result.errors.append(ImportErrorDetail(row=row_number, message=str(exc)))

        return ImportService._finalize(
            db,
            import_type="users",
            user_id=user_id,
            file_name=file_name,
            build_result=result,
        )

    @staticmethod
    def import_sboxes(
        db: Session,
        file_bytes: bytes,
        *,
        file_name: str | None,
        user_id: int | None,
    ) -> ImportResponse:
        sheet = ImportService._parse_file(
            file_bytes,
            SBOX_REQUIRED_HEADERS,
            optional_headers=SBOX_OPTIONAL_HEADERS,
        )
        location_ids = ImportRepository.get_existing_location_ids(db)
        work_area_map = ImportRepository.get_work_area_location_map(db)
        existing_serials = ImportRepository.get_existing_serial_numbers(db)
        existing_ips = ImportRepository.get_existing_box_ips(db)

        seen_serials: set[str] = set()
        seen_ips: set[str] = set()
        next_serial_seq = [SboxRepository.count(db) + 1]

        result = _ImportBuildResult(total_rows=len(sheet.rows))

        for row_data, row_number in zip(sheet.rows, sheet.row_numbers):
            messages: list[str] = []
            try:
                raw_serial = row_data.get("serial_no")
                if raw_serial is None or str(raw_serial).strip() == "":
                    serial_no = ImportService._next_import_serial(
                        existing_serials,
                        seen_serials,
                        next_serial_seq,
                    )
                else:
                    serial_no = ImportService._to_str(
                        raw_serial, "Serial Number"
                    )
                box_ip = ImportService._to_str(row_data.get("box_ip"), "Box IP")
                box_details = ImportService._to_str(
                    row_data.get("box_details"), "Box Details", required=False
                )
                location_id = ImportService._to_int(
                    row_data.get("location_id"), "Location ID"
                )
                work_area_id = ImportService._to_int(
                    row_data.get("work_area_id"), "Work Area ID"
                )
                mfg_date = ImportService._parse_date(
                    row_data.get("mfg_date"), "Manufacturing Date"
                )
                hook_a = ImportService._to_int(
                    row_data.get("hookA_threshold"), "Hook A Threshold"
                )
                hook_b = ImportService._to_int(
                    row_data.get("hookB_threshold"), "Hook B Threshold"
                )

                if location_id not in location_ids:
                    messages.append("Location ID does not exist")
                if work_area_id not in work_area_map:
                    messages.append("Work Area ID does not exist")
                elif work_area_map[work_area_id] != location_id:
                    messages.append("Work Area does not belong to the specified Location")

                serial_key = serial_no.strip()
                ip_key = box_ip.strip().lower()

                if serial_key in existing_serials:
                    messages.append("Serial number already exists")
                if serial_key in seen_serials:
                    messages.append("Duplicate serial number in import file")
                else:
                    seen_serials.add(serial_key)

                if ip_key in existing_ips:
                    messages.append("Box IP already exists")
                if ip_key in seen_ips:
                    messages.append("Duplicate Box IP in import file")
                else:
                    seen_ips.add(ip_key)

                if messages:
                    result.errors.append(
                        ImportErrorDetail(
                            row=row_number,
                            message="; ".join(dict.fromkeys(messages)),
                        )
                    )
                    continue

                result.valid_records.append(
                    BoxDetail(
                        serial_no=serial_no,
                        box_ip=box_ip,
                        box_details=box_details or None,
                        location_id=location_id,
                        work_area_id=work_area_id,
                        last_seen=None,
                        activity_status=ACTIVE_ACTIVITY_STATUS_ID,
                        box_health_status=DEFAULT_BOX_HEALTH_STATUS_ID,
                        mfg_date=mfg_date,
                        hookA_threshold=hook_a,
                        hookB_threshold=hook_b,
                        is_assigned=0,
                    )
                )
                existing_serials.add(serial_key)
                existing_ips.add(ip_key)
            except ValueError as exc:
                result.errors.append(ImportErrorDetail(row=row_number, message=str(exc)))

        return ImportService._finalize(
            db,
            import_type="sboxes",
            user_id=user_id,
            file_name=file_name,
            build_result=result,
        )
