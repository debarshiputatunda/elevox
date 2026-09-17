import json
from unittest.mock import AsyncMock

import httpx
import pytest

from app.utils.telemetry_parser import parse_telemetry_csv
from app.utils.esp_client import fetch_esp_telemetry
import app.telemetry
from app.services.notification_engine import NotificationEngine


def packet(**changes):
    data = dict(protocol='elevox-v5/1', id='TEST', raw1=12000, raw2=13000,
                batt_pct=75, batt_v=3.9, b1=True, b2=False, b3=True,
                alarm=True, mode='BUCKLE', hook_a_valid=True, hook_b_valid=True,
                threshold_a=20000, threshold_b=21000, hook_alarm_enabled=True)
    return data | changes


@pytest.mark.asyncio
async def test_v5_json_normalizes_closed_booleans_and_alarm_cause():
    async with httpx.AsyncClient(transport=httpx.MockTransport(
        lambda request: httpx.Response(200, json=packet()))) as client:
        reading = await fetch_esp_telemetry(client, 'test-device')
    assert (reading.buckle1, reading.buckle2, reading.buckle3) == (0, 1, 0)
    assert reading.alarm_active == 1
    assert reading.alarm_cause == 'BUCKLE'
    assert reading.autonomous_hooks is True
    assert (reading.device_threshold_a, reading.device_threshold_b) == (20000, 21000)


@pytest.mark.parametrize('payload', [
    '1,2,80,4.0,0,,0,1,0', '1,2,80,4.0,0,2,0,0',
    '1,2,80,nan,0,0,0,0', '1,2,101,4.0,0,0,0,0',
])
def test_rejects_malformed_csv_instead_of_shifting_or_hiding_fault(payload):
    with pytest.raises(ValueError):
        parse_telemetry_csv(payload)


@pytest.mark.asyncio
async def test_v5_device_alarm_does_not_also_receive_backend_pulse(monkeypatch):
    from app.utils.telemetry_parser import parse_telemetry
    engine = NotificationEngine()
    monkeypatch.setattr(engine, '_emit', lambda *args, **kwargs: {})
    monkeypatch.setattr('app.services.notification_engine.telemetry_ws_manager.broadcast_to_all', AsyncMock())
    pulse = AsyncMock()
    monkeypatch.setattr('app.services.notification_engine.esp_alarm_controller.request_pulse', pulse)
    await engine.process_reading(None, box_id=1, controller_name='TEST',
        reading=parse_telemetry(json.dumps(packet())), hook_a_threshold=50,
        hook_b_threshold=50, box_ip='test-device')
    pulse.assert_not_awaited()


def test_invalid_sensor_is_preserved_as_fault():
    from app.utils.telemetry_parser import parse_telemetry
    reading = parse_telemetry(json.dumps(packet(raw1=-1, hook_a_valid=False, mode='SENSOR')))
    assert reading.hook_a_valid is False
    assert reading.alarm_cause == 'SENSOR'


@pytest.mark.parametrize('changes', [dict(b1='false'), dict(raw1=1.5),
    dict(threshold_a=-1), dict(protocol='elevox-v5/99'), dict(hook_a_valid='true')])
def test_json_requires_strict_protocol_fields(changes):
    from app.utils.telemetry_parser import parse_telemetry
    with pytest.raises(ValueError):
        parse_telemetry(json.dumps(packet(**changes)))


def test_v6_high_guard_uses_existing_alarm_and_sync_contract():
    from app.utils.telemetry_parser import parse_telemetry
    reading = parse_telemetry(json.dumps(packet(
        firmware='v6-high-guard', guard='HIGH', mutual_valid=False,
        a_timeouts=16, b_timeouts=0, raw1=-1, hook_a_valid=False,
        state='UNKNOWN', mode='SENSOR')))
    assert reading.autonomous_hooks is True
    assert reading.threshold_sync == 'pending'
    assert reading.device_threshold_a == 20000
    assert reading.hook_a == -1 and not reading.hook_a_valid
    assert reading.alarm_cause == 'SENSOR'
