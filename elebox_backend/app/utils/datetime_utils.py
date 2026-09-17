from __future__ import annotations

from datetime import datetime, timezone


def utc_now() -> datetime:
    """Return the current time as a timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)


def utc_now_naive() -> datetime:
    """Return the current UTC time as a naive datetime for MySQL TIMESTAMP columns."""
    return utc_now().replace(tzinfo=None)


def assume_utc(value: datetime) -> datetime:
    """Treat naive database timestamps as UTC and normalize aware values to UTC."""
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def format_iso_utc(value: datetime | None) -> str | None:
    """Serialize a datetime for API responses with an explicit UTC offset."""
    if value is None:
        return None
    return assume_utc(value).isoformat()
