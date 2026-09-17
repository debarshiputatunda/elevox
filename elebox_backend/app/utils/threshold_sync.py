import time
from dataclasses import replace

import httpx

from app.core.telemetry_config import TELEMETRY_REQUEST_TIMEOUT_S
from app.utils.esp_client import normalize_esp_base_url
from app.utils.telemetry_parser import TelemetryReading


class ThresholdSynchronizer:
    """One sequential writer per poller; confirm persistence through fresh telemetry."""

    def __init__(self, retry_seconds: float = 2):
        self.retry_seconds = retry_seconds
        self._last_attempt = float('-inf')
        self._last_target = None
        self._status = 'pending'

    async def reconcile(self, client: httpx.AsyncClient, address: str,
                        reading: TelemetryReading, threshold_a: int, threshold_b: int):
        if not reading.autonomous_hooks:
            return reading
        editable = reading.threshold_edit_revision is not None
        acknowledged = not editable or (
            not reading.threshold_edit_pending and reading.threshold_base_valid
            and (reading.threshold_base_a, reading.threshold_base_b) == (threshold_a, threshold_b))
        if (reading.device_threshold_a, reading.device_threshold_b) == (threshold_a, threshold_b) and reading.hook_alarm_enabled and acknowledged:
            self._status = 'synced'
            return replace(reading, threshold_sync='synced')
        target = (address, threshold_a, threshold_b, reading.threshold_edit_revision)
        if target != self._last_target or time.monotonic() - self._last_attempt >= self.retry_seconds:
            self._last_target = target
            self._last_attempt = time.monotonic()
            try:
                data = {'threshold_a': str(threshold_a), 'threshold_b': str(threshold_b)}
                if editable:
                    data['expected_revision'] = str(reading.threshold_edit_revision)
                response = await client.post(f'{normalize_esp_base_url(address)}/thresholds',
                    data=data,
                    timeout=TELEMETRY_REQUEST_TIMEOUT_S)
                response.raise_for_status()
                if response.json().get('saved') is not True:
                    raise ValueError('Device did not confirm EEPROM persistence')
                self._status = 'pending'
            except (httpx.HTTPError, ValueError, AttributeError):
                self._status = 'error'
        return replace(reading, threshold_sync=self._status if self._status != 'synced' else 'pending')
