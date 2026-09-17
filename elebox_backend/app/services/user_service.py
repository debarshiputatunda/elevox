from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.rbac import ACTIVE_STATUS_NAME, RoleName
from app.models.users import User
from app.repositories.auth_repository import AuthRepository
from app.repositories.role_repository import RoleRepository
from app.repositories.user_repository import UserRepository
from app.repositories.work_area_repository import WorkAreaRepository
from app.services.role_service import ADMIN_ROLE_ID, RoleService
from app.utils.password_handler import hash_password


class UserService:

    @staticmethod
    def _build_user_response(db: Session, user: User):
        roles = RoleRepository.get_user_roles(db, user.user_id)
        status_name = (
            AuthRepository.get_account_status_name(db, user.status_id)
            if user.status_id is not None
            else ACTIVE_STATUS_NAME
        )

        role_ids = [role.role_id for role in roles]

        return {
            "user_id": user.user_id,
            "employee_id": user.employee_id,
            "employee_name": user.employee_name,
            "email_id": user.email_id,
            "phonenumber": user.phonenumber,
            "status_id": user.status_id,
            "status": status_name or ACTIVE_STATUS_NAME,
            "job_title_id": user.job_title_id,
            "job_title_name": UserRepository.get_job_title_name(
                db,
                user.job_title_id,
            ),
            "work_area_id": user.work_area_id,
            "work_area_name": UserRepository.get_work_area_name(
                db,
                user.work_area_id,
            ),
            "location_id": user.location_id,
            "location_name": UserRepository.get_location_name(
                db,
                user.location_id,
            ),
            "role_ids": role_ids,
            "roles": [
                {
                    "role_id": role.role_id,
                    "role_name": role.role_name,
                    "description": role.description,
                }
                for role in roles
            ],
            "created_at": user.created_at,
        }

    @staticmethod
    def _validate_location_and_work_area(
        db: Session,
        location_id: int,
        work_area_id: int,
    ):
        if WorkAreaRepository.get_location_by_id(db, location_id) is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Location does not exist",
            )

        work_area = WorkAreaRepository.get_by_id(db, work_area_id)
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
    def _ensure_unique_fields(
        db: Session,
        *,
        employee_id: str | None = None,
        email_id: str | None = None,
        phonenumber: str | None = None,
        exclude_user_id: int | None = None,
    ):
        if employee_id is not None:
            existing = AuthRepository.get_user_by_employee_id(db, employee_id)
            if existing and existing.user_id != exclude_user_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Employee ID already exists",
                )

        if email_id is not None:
            existing = AuthRepository.get_user_by_email(db, email_id)
            if existing and existing.user_id != exclude_user_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already exists",
                )

        if phonenumber is not None:
            existing = AuthRepository.get_user_by_phone(db, phonenumber)
            if existing and existing.user_id != exclude_user_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Phone number already exists",
                )

    @staticmethod
    def _ensure_not_last_admin(db: Session, user_id: int):
        if not RoleRepository.user_has_role(db, user_id, ADMIN_ROLE_ID):
            return

        admin_count = RoleRepository.count_users_with_role(
            db=db,
            role_id=ADMIN_ROLE_ID,
        )
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove or delete the last Admin user",
            )

    @staticmethod
    def list_users(db: Session):
        users = UserRepository.get_all_users(db)
        return [
            UserService._build_user_response(db, user)
            for user in users
        ]

    @staticmethod
    def get_user(db: Session, user_id: int):
        user = AuthRepository.get_user_by_id(db, user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        return UserService._build_user_response(db, user)

    @staticmethod
    def create_user(db: Session, request):
        UserService._ensure_unique_fields(
            db,
            employee_id=request.employee_id,
            email_id=request.email_id,
            phonenumber=request.phonenumber,
        )

        RoleService.validate_role_ids(db, request.role_ids)
        RoleService.ensure_assignable_roles(request.role_ids)
        UserService._validate_location_and_work_area(
            db,
            request.location_id,
            request.work_area_id,
        )

        user = User(
            employee_id=request.employee_id,
            status_id=request.status_id,
            employee_name=request.employee_name,
            job_title_id=request.job_title_id,
            email_id=request.email_id,
            phonenumber=request.phonenumber,
            work_area_id=request.work_area_id,
            location_id=request.location_id,
            password=hash_password(request.password),
        )

        user = AuthRepository.create_user(db, user)
        RoleRepository.assign_roles_to_user(
            db=db,
            user_id=user.user_id,
            role_ids=request.role_ids,
        )

        return UserService._build_user_response(db, user)

    @staticmethod
    def update_user(db: Session, user_id: int, request):
        user = AuthRepository.get_user_by_id(db, user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        update_data = request.model_dump(exclude_unset=True)
        role_ids = update_data.pop("role_ids", None)
        password = update_data.pop("password", None)

        UserService._ensure_unique_fields(
            db,
            employee_id=update_data.get("employee_id"),
            email_id=update_data.get("email_id"),
            phonenumber=update_data.get("phonenumber"),
            exclude_user_id=user_id,
        )

        location_id = update_data.get("location_id", user.location_id)
        work_area_id = update_data.get("work_area_id", user.work_area_id)
        if location_id is not None and work_area_id is not None:
            UserService._validate_location_and_work_area(
                db,
                location_id,
                work_area_id,
            )

        if role_ids is not None:
            RoleService.validate_role_ids(db, role_ids)
            RoleService.ensure_assignable_roles(role_ids)

            had_admin = RoleRepository.user_has_role(db, user_id, ADMIN_ROLE_ID)
            will_have_admin = ADMIN_ROLE_ID in role_ids
            if had_admin and not will_have_admin:
                UserService._ensure_not_last_admin(db, user_id)

            RoleRepository.replace_user_roles(
                db=db,
                user_id=user_id,
                role_ids=role_ids,
            )

        for field, value in update_data.items():
            setattr(user, field, value)

        if password is not None:
            user.password = hash_password(password)

        user = UserRepository.update_user(db, user)
        return UserService._build_user_response(db, user)

    @staticmethod
    def edit_user(db: Session, user_id: int, request):
        user = AuthRepository.get_user_by_id(db, user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        UserService._ensure_unique_fields(
            db,
            employee_id=request.employee_id,
            email_id=request.email_id,
            phonenumber=request.phonenumber,
            exclude_user_id=user_id,
        )

        RoleService.validate_role_ids(db, request.role_ids)
        RoleService.ensure_assignable_roles(request.role_ids)
        UserService._validate_location_and_work_area(
            db,
            request.location_id,
            request.work_area_id,
        )

        had_admin = RoleRepository.user_has_role(db, user_id, ADMIN_ROLE_ID)
        will_have_admin = ADMIN_ROLE_ID in request.role_ids
        if had_admin and not will_have_admin:
            UserService._ensure_not_last_admin(db, user_id)

        user.employee_id = request.employee_id
        user.employee_name = request.employee_name
        user.email_id = request.email_id
        user.phonenumber = request.phonenumber
        user.status_id = request.status_id
        user.job_title_id = request.job_title_id
        user.work_area_id = request.work_area_id
        user.location_id = request.location_id

        if request.password:
            user.password = hash_password(request.password)

        user = UserRepository.update_user(db, user)
        RoleRepository.replace_user_roles(
            db=db,
            user_id=user_id,
            role_ids=request.role_ids,
        )

        return UserService._build_user_response(db, user)

    @staticmethod
    def delete_user(db: Session, user_id: int, caller_user_id: int):
        if caller_user_id == user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot delete your own account",
            )

        user = AuthRepository.get_user_by_id(db, user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        UserService._ensure_not_last_admin(db, user_id)

        try:
            RoleRepository.remove_all_roles_from_user(db, user_id)
            UserRepository.delete_user(db, user)
        except IntegrityError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "User cannot be deleted because related records exist "
                    "(e.g. tickets, box assignments, or logs)"
                ),
            )

        return {"message": "User deleted successfully"}
