from sqlalchemy import Column, ForeignKey, Integer, String, TIMESTAMP, text

from app.core.database import Base


class ImportHistory(Base):
    __tablename__ = "import_history"

    import_id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    import_type = Column(
        String(50),
        nullable=False,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.user_id"),
        nullable=True,
    )

    file_name = Column(
        String(255),
        nullable=True,
    )

    total_rows = Column(
        Integer,
        nullable=False,
    )

    success_rows = Column(
        Integer,
        nullable=False,
    )

    failed_rows = Column(
        Integer,
        nullable=False,
    )

    created_at = Column(
        TIMESTAMP,
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )
