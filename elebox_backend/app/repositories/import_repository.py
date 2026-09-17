from sqlalchemy.orm import Session

from app.models.account_status import AccountStatus
from app.models.box_details import BoxDetail
from app.models.city import City
from app.models.country import Country
from app.models.import_history import ImportHistory
from app.models.job_tittle import JobTitle
from app.models.locations import Location
from app.models.users import User
from app.models.work_areas import WorkArea


class ImportRepository:

    # ------------------------------------------------------------------
    # Lookup sets (batch existence checks)
    # ------------------------------------------------------------------

    @staticmethod
    def get_existing_country_ids(db: Session) -> set[int]:
        rows = db.query(Country.country_id).all()
        return {row[0] for row in rows}

    @staticmethod
    def get_existing_city_ids(db: Session) -> set[int]:
        rows = db.query(City.city_id).all()
        return {row[0] for row in rows}

    @staticmethod
    def get_existing_location_ids(db: Session) -> set[int]:
        rows = db.query(Location.location_id).all()
        return {row[0] for row in rows}

    @staticmethod
    def get_existing_location_names(db: Session) -> set[str]:
        rows = db.query(Location.location_name).all()
        return {
            (row[0] or "").strip().lower()
            for row in rows
            if row[0]
        }

    @staticmethod
    def get_work_area_keys(db: Session) -> set[tuple[int, str]]:
        rows = db.query(WorkArea.location_id, WorkArea.work_area_name).all()
        return {
            (row[0], (row[1] or "").strip().lower())
            for row in rows
            if row[1]
        }

    @staticmethod
    def get_existing_employee_ids(db: Session) -> set[str]:
        rows = db.query(User.employee_id).filter(User.employee_id.isnot(None)).all()
        return {(row[0] or "").strip() for row in rows if row[0]}

    @staticmethod
    def get_existing_emails(db: Session) -> set[str]:
        rows = db.query(User.email_id).filter(User.email_id.isnot(None)).all()
        return {(row[0] or "").strip().lower() for row in rows if row[0]}

    @staticmethod
    def get_existing_phone_numbers(db: Session) -> set[str]:
        rows = db.query(User.phonenumber).filter(User.phonenumber.isnot(None)).all()
        return {(row[0] or "").strip() for row in rows if row[0]}

    @staticmethod
    def get_existing_status_ids(db: Session) -> set[int]:
        rows = db.query(AccountStatus.status_id).all()
        return {row[0] for row in rows}

    @staticmethod
    def get_existing_job_title_ids(db: Session) -> set[int]:
        rows = db.query(JobTitle.job_title_id).all()
        return {row[0] for row in rows}

    @staticmethod
    def get_work_area_location_map(db: Session) -> dict[int, int]:
        rows = db.query(WorkArea.work_area_id, WorkArea.location_id).all()
        return {row[0]: row[1] for row in rows}

    @staticmethod
    def get_existing_serial_numbers(db: Session) -> set[str]:
        rows = db.query(BoxDetail.serial_no).filter(BoxDetail.serial_no.isnot(None)).all()
        return {(row[0] or "").strip() for row in rows if row[0]}

    @staticmethod
    def get_existing_box_ips(db: Session) -> set[str]:
        rows = db.query(BoxDetail.box_ip).filter(BoxDetail.box_ip.isnot(None)).all()
        return {(row[0] or "").strip().lower() for row in rows if row[0]}

    # ------------------------------------------------------------------
    # Bulk inserts
    # ------------------------------------------------------------------

    @staticmethod
    def bulk_insert_locations(db: Session, records: list[Location]) -> int:
        db.add_all(records)
        db.flush()
        return len(records)

    @staticmethod
    def bulk_insert_work_areas(db: Session, records: list[WorkArea]) -> int:
        db.add_all(records)
        db.flush()
        return len(records)

    @staticmethod
    def bulk_insert_users(db: Session, records: list[User]) -> int:
        db.add_all(records)
        db.flush()
        return len(records)

    @staticmethod
    def bulk_insert_sboxes(db: Session, records: list[BoxDetail]) -> int:
        db.add_all(records)
        db.flush()
        return len(records)

    # ------------------------------------------------------------------
    # Import history
    # ------------------------------------------------------------------

    @staticmethod
    def log_import(
        db: Session,
        *,
        import_type: str,
        user_id: int | None,
        file_name: str | None,
        total_rows: int,
        success_rows: int,
        failed_rows: int,
    ) -> ImportHistory:
        entry = ImportHistory(
            import_type=import_type,
            user_id=user_id,
            file_name=file_name,
            total_rows=total_rows,
            success_rows=success_rows,
            failed_rows=failed_rows,
        )
        db.add(entry)
        db.flush()
        db.refresh(entry)
        return entry
