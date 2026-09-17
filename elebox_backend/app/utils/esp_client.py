import asyncio

import httpx

from app.core.telemetry_config import (
    ESP_ALARM_OFF_PATH,
    ESP_ALARM_ON_PATH,
    TELEMETRY_MAX_RETRIES,
    TELEMETRY_REQUEST_TIMEOUT_S,
    TELEMETRY_RETRY_DELAY_S,
)
from app.utils.logger import get_logger
from app.utils.telemetry_parser import TelemetryReading, parse_telemetry

logger = get_logger("esp_client")


def normalize_esp_base_url(box_ip: str) -> str:
    value = box_ip.strip()
    if not value:
        raise ValueError("box_ip is empty")
    if not value.startswith("http://") and not value.startswith("https://"):
        value = f"http://{value}"
    return value.rstrip("/")


def _normalize_path(path: str) -> str:
    value = (path or "").strip() or "/"
    return value if value.startswith("/") else f"/{value}"


async def fetch_esp_telemetry(
    client: httpx.AsyncClient,
    box_ip: str,
    *,
    box_id: int | None = None,
) -> TelemetryReading:
    base_url = normalize_esp_base_url(box_ip)
    url = f"{base_url}/data"
    last_error: Exception | None = None

    for attempt in range(1, TELEMETRY_MAX_RETRIES + 2):
        try:
            response = await client.get(url, timeout=TELEMETRY_REQUEST_TIMEOUT_S)
            response.raise_for_status()
            return parse_telemetry(response.text.strip())
        except Exception as exc:
            last_error = exc
            if attempt <= TELEMETRY_MAX_RETRIES:
                await asyncio.sleep(TELEMETRY_RETRY_DELAY_S)
                continue
            break

    label = f"box_id={box_id}" if box_id is not None else box_ip
    logger.warning("ESP telemetry fetch failed for %s: %s", label, last_error)
    raise last_error or RuntimeError("ESP telemetry fetch failed")


async def _request_esp_path(
    client: httpx.AsyncClient,
    box_ip: str,
    path: str,
    *,
    box_id: int | None = None,
    action: str,
) -> None:
    base_url = normalize_esp_base_url(box_ip)
    url = f"{base_url}{_normalize_path(path)}"
    last_error: Exception | None = None

    for attempt in range(1, TELEMETRY_MAX_RETRIES + 2):
        try:
            response = await client.get(url, timeout=TELEMETRY_REQUEST_TIMEOUT_S)
            response.raise_for_status()
            return
        except Exception as exc:
            last_error = exc
            if attempt <= TELEMETRY_MAX_RETRIES:
                await asyncio.sleep(TELEMETRY_RETRY_DELAY_S)
                continue
            break

    label = f"box_id={box_id}" if box_id is not None else box_ip
    logger.error("ESP alarm %s failed for %s: %s", action, label, last_error)
    raise last_error or RuntimeError(f"ESP alarm {action} failed")


async def set_esp_alarm(
    client: httpx.AsyncClient,
    box_ip: str,
    active: bool,
    *,
    box_id: int | None = None,
) -> None:
    """Drive continuous ESP alarm state: True → ON path, False → OFF path."""
    path = ESP_ALARM_ON_PATH if active else ESP_ALARM_OFF_PATH
    action = "ON" if active else "OFF"
    await _request_esp_path(client, box_ip, path, box_id=box_id, action=action)


async def trigger_esp_alarm(
    client: httpx.AsyncClient,
    box_ip: str,
    *,
    box_id: int | None = None,
) -> None:
    """Manual one-shot / legacy trigger (always hits the ON path)."""
    await set_esp_alarm(client, box_ip, True, box_id=box_id)
