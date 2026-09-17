import sys
import os
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from sqlalchemy import text
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from app.core.database import SessionLocal
from app.models import (
    AccountStatus,
    ActivityStatus,
    BoxDetail,
    BoxHealth,
    City,
    Country,
    JobTitle,
    Location,
    Role,
    User,
    UserRole,
    WorkArea,
)
from app.repositories.box_assignment_repository import BoxAssignmentRepository
from app.repositories.box_log_repository import BoxLogRepository

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)


def seed():
    admin_password = os.environ["ELEVOX_SEED_ADMIN_PASSWORD"]
    db: Session = SessionLocal()

    try:
        # =========================================
        # ACCOUNT STATUS
        # =========================================

        db.add_all([
            AccountStatus(status_name="Active"),
            AccountStatus(status_name="Inactive"),
            AccountStatus(status_name="Blocked"),
        ])

        # =========================================
        # JOB TITLES
        # =========================================

        db.add_all([
            JobTitle(job_title_name="Administrator"),
            JobTitle(job_title_name="Manager"),
            JobTitle(job_title_name="Employee"),
        ])

        # =========================================
        # ROLES
        # =========================================

        db.add_all([
            Role(
                role_name="Admin",
                description="System Administrator",
            ),
            Role(
                role_name="Manager",
                description="Manager Role",
            ),
            Role(
                role_name="Employee",
                description="Employee Role",
            ),
        ])

        # =========================================
        # COUNTRY
        # =========================================

        db.add(Country(country_name="India"))

        # =========================================
        # CITY
        # =========================================

        db.add(City(city_name="Kolkata"))

        db.commit()

        # =========================================
        # LOCATION
        # =========================================

        db.add(
            Location(
                country_id=1,
                city_id=1,
                location_name="Kolkata Office",
            )
        )

        db.commit()

        # =========================================
        # WORK AREAS
        # =========================================

        db.add_all([
            WorkArea(work_area_name="Assembly Line 1", location_id=1),
            WorkArea(work_area_name="Loading Dock", location_id=1),
            WorkArea(work_area_name="Storage Zone", location_id=1),
        ])

        # =========================================
        # ACTIVITY STATUS
        # =========================================

        db.add_all([
            ActivityStatus(activity_status_name="Active"),
            ActivityStatus(activity_status_name="Inactive"),
        ])

        # =========================================
        # BOX HEALTH
        # =========================================

        db.add_all([
            BoxHealth(health_status_name="Healthy"),
            BoxHealth(health_status_name="Warning"),
            BoxHealth(health_status_name="Critical"),
        ])

        db.commit()

        # =========================================
        # LOOKUP TABLES (no ORM models yet)
        # =========================================

        db.execute(
            text(
                """
                INSERT INTO buckle_status (buckle_status_name)
                VALUES ('Locked'), ('Unlocked')
                """
            )
        )

        db.execute(
            text(
                """
                INSERT INTO tickets_status (status_type)
                VALUES ('Open'), ('In Progress'), ('Closed')
                """
            )
        )

        db.execute(
            text(
                """
                INSERT INTO tickets_type (type_name)
                VALUES ('Hardware'), ('Software'), ('General')
                """
            )
        )

        db.commit()

        # =========================================
        # DEFAULT ADMIN USER
        # =========================================

        admin_user = User(
            employee_id="EMP001",
            status_id=1,
            employee_name="Example Administrator",
            job_title_id=1,
            email_id=os.getenv("ELEVOX_SEED_ADMIN_EMAIL", "admin@example.test"),
            phonenumber="0000000000",
            work_area_id=1,
            location_id=1,
            password=pwd_context.hash(admin_password),
        )

        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

        # =========================================
        # DEFAULT ADMIN ROLE
        # =========================================

        db.add(
            UserRole(
                user_role_id=1,
                role_id=1,
                user_id=admin_user.user_id,
            )
        )

        # =========================================
        # ADMIN CITY MAP
        # =========================================

        db.execute(
            text(
                """
                INSERT INTO admin_level_user_multi_city_map (user_id, city_id)
                VALUES (:user_id, :city_id)
                """
            ),
            {"user_id": admin_user.user_id, "city_id": 1},
        )

        db.commit()

        # =========================================
        # SAMPLE S-BOX
        # =========================================

        sample_box = BoxDetail(
            serial_no="SBOX-2026-0001",
            box_ip="192.168.1.100",
            box_details="Demo controller unit",
            location_id=1,
            work_area_id=1,
            activity_status=1,
            box_health_status=1,
            hookA_threshold=50,
            hookB_threshold=50,
        )
        db.add(sample_box)
        db.commit()
        db.refresh(sample_box)

        # =========================================
        # BOX ASSIGNMENT
        # =========================================

        BoxAssignmentRepository.create(
            db,
            user_id=admin_user.user_id,
            box_id=sample_box.box_id,
            work_area_id=1,
        )

        # =========================================
        # BOX LOGS
        # =========================================

        BoxLogRepository.create(
            db,
            user_id=admin_user.user_id,
            box_id=sample_box.box_id,
            work_area_id=1,
            description=(
                f"S-Box {sample_box.serial_no} assigned to "
                f"{admin_user.employee_name} in Assembly Line 1 by system seed"
            ),
        )

        db.commit()

        print("Database seeded successfully.")

    except Exception as e:
        db.rollback()
        print(f"Seed failed: {e}")
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed()
