from dataclasses import replace
from urllib.parse import parse_qs

import httpx
import pytest

from app.utils.telemetry_parser import TelemetryReading


def device(**changes):
    return replace(TelemetryReading(12000, 12000, 80, 4, 0, 0, 0, 0),
                   protocol='elevox-v5/1', autonomous_hooks=True,
                   device_threshold_a=5000, device_threshold_b=5000,
                   hook_alarm_enabled=True, **changes)


@pytest.mark.asyncio
async def test_sends_both_thresholds_and_waits_for_telemetry_confirmation():
    from app.utils.threshold_sync import ThresholdSynchronizer
    requests = []
    def handler(request):
        requests.append(request)
        return httpx.Response(200, json={'saved': True, 'threshold_a': 20000, 'threshold_b': 21000})
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        sync = ThresholdSynchronizer()
        first = await sync.reconcile(client, 'device', device(), 20000, 21000)
        assert first.threshold_sync == 'pending'
        assert parse_qs(requests[0].content.decode()) == {'threshold_a': ['20000'], 'threshold_b': ['21000']}
        assert requests[0].method == 'POST'
        confirmed = await sync.reconcile(client, 'device', replace(device(), device_threshold_a=20000, device_threshold_b=21000), 20000, 21000)
        assert confirmed.threshold_sync == 'synced'
        assert len(requests) == 1


@pytest.mark.asyncio
async def test_offline_config_does_not_drop_sensor_reading_and_retries():
    from app.utils.threshold_sync import ThresholdSynchronizer
    attempts = []
    def handler(request):
        attempts.append(request)
        return httpx.Response(503 if len(attempts) == 1 else 200, json={'saved': len(attempts) > 1})
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        sync = ThresholdSynchronizer(retry_seconds=0)
        failed = await sync.reconcile(client, 'device', device(), 20000, 21000)
        assert failed.threshold_sync == 'error'
        assert failed.hook_a == 12000
        retry = await sync.reconcile(client, 'device', device(), 20000, 21000)
        assert retry.threshold_sync == 'pending'
        assert len(attempts) == 2


@pytest.mark.asyncio
async def test_old_csv_does_not_receive_configuration_requests():
    from app.utils.threshold_sync import ThresholdSynchronizer
    def handler(request):
        pytest.fail('Legacy device must not receive /thresholds')
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        reading = TelemetryReading(10, 20, 80, 4, 0, 0, 0, 0)
        result = await ThresholdSynchronizer().reconcile(client, 'device', reading, 0, 100000)
        assert result.threshold_sync == 'backend-only'
