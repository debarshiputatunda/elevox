from sqlalchemy.orm import Session

from app.models.account_status import AccountStatus
from app.models.users import User


class AuthRepository:

    @staticmethod
    def get_user_by_email(
        db: Session,
        email: str,
    ):
        """
        Fetch user by email.
        """
        return (
            db.query(User)
            .filter(User.email_id == email)
            .first()
        )

    @staticmethod
    def get_user_by_employee_id(
        db: Session,
        employee_id: str,
    ):
        """
        Fetch user by employee_id.
        """
        return (
            db.query(User)
            .filter(User.employee_id == employee_id)
            .first()
        )

    @staticmethod
    def get_user_by_id(
        db: Session,
        user_id: int,
    ):
        """
        Fetch user by primary key.
        """
        return (
            db.query(User)
            .filter(User.user_id == user_id)
            .first()
        )

    @staticmethod
    def create_user(
        db: Session,
        user: User,
    ):
        """
        Create a new user.
        """
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def get_account_status_name(db: Session, status_id: int):
        status = (
            db.query(AccountStatus)
            .filter(AccountStatus.status_id == status_id)
            .first()
        )
        return status.status_name if status else None

    @staticmethod
    def get_user_by_phone(
        db: Session,
        phone: str,
    ):
        """
        Fetch user by phone number.
        """
        return (
            db.query(User)
            .filter(User.phonenumber == phone)
            .first()
        )
