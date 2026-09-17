import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")


def _parse_csv(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def _parse_bool(value: str | None) -> bool:
    if value is None:
        return False
    return value.strip().lower() in ("true", "1", "yes")


ALLOWED_ORIGINS = _parse_csv(os.getenv("ALLOWED_ORIGINS"))
ALLOWED_METHODS = _parse_csv(os.getenv("ALLOWED_METHODS"))
ALLOWED_HEADERS = _parse_csv(os.getenv("ALLOWED_HEADERS"))
ALLOWED_CREDENTIALS = _parse_bool(os.getenv("ALLOWED_CREDENTIALS"))
