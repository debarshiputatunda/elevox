import json
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.sboxes import router
from app.core.database import get_db
from app.middlewares.auth_middleware import get_current_user
from app.services.notification_engine import NotificationEngine
from app.telemetry.events import BoxMeta
from app.telemetry.payload import build_ws_payload
from app.utils.telemetry_parser import parse_telemetry
from tests.test_v5_protocol import packet


@pytest.mark.parametrize('enabled', [True, False, None])
def test_telemetry_preserves_buckle_setting_and_actual_open_sensor(enabled):
    data = packet() if enabled is None else packet(buckle_alarm_enabled=enabled)
    reading = parse_telemetry(json.dumps(data))
    assert reading.buckle_alarm_enabled is enabled
    payload = build_ws_payload(BoxMeta(1, 'TEST', None, 'test', 50, 50), reading, datetime.now())
    assert payload['buckle_alarm_enabled'] is enabled
    assert payload['buckle2'] == 1


@pytest.mark.parametrize('invalid', ['false', 0, 1, None])
def test_invalid_setting_is_not_silently_muted(invalid):
    with pytest.raises(ValueError):
        parse_telemetry(json.dumps(packet(buckle_alarm_enabled=invalid)))


@pytest.mark.asyncio
async def test_buckle_off_suppresses_buckle_notifications_and_reenable_emits(monkeypatch):
    engine = NotificationEngine()
    emitted = []
    monkeypatch.setattr(engine, '_emit', lambda *a, **kw: emitted.append(kw['title']) or {})
    monkeypatch.setattr('app.services.notification_engine.telemetry_ws_manager.broadcast_to_all', AsyncMock())
    for enabled in (False, True, False, True):
        emitted.clear()
        await engine.process_reading(None, box_id=1, controller_name='TEST',
            reading=parse_telemetry(json.dumps(packet(buckle_alarm_enabled=enabled))),
            hook_a_threshold=10000, hook_b_threshold=10000, box_ip='test')
        assert ('Buckle Opened' in emitted) is enabled
        assert ('Alarm Triggered' in emitted) is enabled
        if not enabled and 'Controller Online' in emitted:
            assert 'Hook A Threshold Exceeded' in emitted


@pytest.fixture
def api(monkeypatch):
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_db] = lambda: object()
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(user_id=1)
    monkeypatch.setattr('app.middlewares.auth_middleware._get_user_role_names', lambda *a: {'Admin'})
    monkeypatch.setattr('app.services.sbox_service.SboxRepository.get_by_id',
                        lambda *a: SimpleNamespace(box_ip=' test-device/ '))
    return app, TestClient(app)


def mock_device(monkeypatch, handler):
    original = httpx.AsyncClient
    monkeypatch.setattr('app.services.sbox_service.httpx.AsyncClient',
                        lambda **kw: original(transport=httpx.MockTransport(handler), **kw))


@pytest.mark.parametrize('enabled', [True, False])
def test_patch_requires_device_saved_confirmation(api, monkeypatch, enabled):
    def handler(request):
        assert str(request.url) == 'http://test-device/buckle-alarm'
        assert request.method == 'POST'
        assert request.content == f'enabled={int(enabled)}'.encode()
        return httpx.Response(200, json={'saved': True, 'enabled': enabled})
    mock_device(monkeypatch, handler)
    response = api[1].patch('/sboxes/1/buckle-alarm', json={'enabled': enabled})
    assert response.status_code == 200
    assert response.json()['enabled'] is enabled
    assert response.json()['confirmed'] is True
    assert datetime.fromisoformat(response.json()['confirmed_at']).tzinfo is not None


@pytest.mark.parametrize('body', [{}, {'enabled': 'false'}, {'enabled': 0}, {'enabled': None}, {'enabled': False, 'extra': 1}])
def test_patch_strict_boolean(api, body):
    assert api[1].patch('/sboxes/1/buckle-alarm', json=body).status_code == 422


@pytest.mark.parametrize('device_reply', [{'saved': False, 'enabled': False}, {'saved': True, 'enabled': True}, {'saved': True, 'enabled': 0}, {'ok': True}])
def test_patch_rejects_unconfirmed_device_reply(api, monkeypatch, device_reply):
    mock_device(monkeypatch, lambda req: httpx.Response(200, json=device_reply))
    assert api[1].patch('/sboxes/1/buckle-alarm', json={'enabled': False}).status_code == 502


@pytest.mark.parametrize('device_status,expected', [(404, 409), (500, 502)])
def test_patch_handles_device_error(api, monkeypatch, device_status, expected):
    mock_device(monkeypatch, lambda req: httpx.Response(device_status))
    assert api[1].patch('/sboxes/1/buckle-alarm', json={'enabled': False}).status_code == expected


def test_patch_offline(api, monkeypatch):
    def handler(req):
        raise httpx.ConnectError('offline', request=req)
    mock_device(monkeypatch, handler)
    assert api[1].patch('/sboxes/1/buckle-alarm', json={'enabled': False}).status_code == 503


def test_patch_permission(api, monkeypatch):
    monkeypatch.setattr('app.middlewares.auth_middleware._get_user_role_names', lambda *a: {'Employee'})
    assert api[1].patch('/sboxes/1/buckle-alarm', json={'enabled': False}).status_code == 403
    api[0].dependency_overrides.pop(get_current_user)
    assert api[1].patch('/sboxes/1/buckle-alarm', json={'enabled': False}).status_code in (401, 403)


@pytest.mark.asyncio
@pytest.mark.parametrize('enabled,mode,expected', [(None, 'BUCKLE', True), (False, 'HOOK', True), (False, 'MANUAL', True)])
async def test_legacy_buckle_and_other_alarm_causes_remain_enabled(monkeypatch, enabled, mode, expected):
    engine = NotificationEngine()
    emitted = []
    monkeypatch.setattr(engine, '_emit', lambda *a, **kw: emitted.append(kw['title']) or {})
    monkeypatch.setattr('app.services.notification_engine.telemetry_ws_manager.broadcast_to_all', AsyncMock())
    data = packet(mode=mode)
    if enabled is not None:
        data['buckle_alarm_enabled'] = enabled
    await engine.process_reading(None, box_id=1, controller_name='TEST',
        reading=parse_telemetry(json.dumps(data)), hook_a_threshold=20000, hook_b_threshold=20000)
    assert ('Alarm Triggered' in emitted) is expected
    assert ('Buckle Opened' in emitted) is (enabled is not False)


def test_missing_device_and_address(api, monkeypatch):
    monkeypatch.setattr('app.services.sbox_service.SboxRepository.get_by_id', lambda *a: None)
    assert api[1].patch('/sboxes/1/buckle-alarm', json={'enabled': False}).status_code == 404
    monkeypatch.setattr('app.services.sbox_service.SboxRepository.get_by_id', lambda *a: SimpleNamespace(box_ip=None))
    assert api[1].patch('/sboxes/1/buckle-alarm', json={'enabled': False}).status_code == 409


def test_legacy_html_success_is_not_a_saved_setting(api, monkeypatch):
    mock_device(monkeypatch, lambda req: httpx.Response(200, text='<html>device dashboard</html>'))
    assert api[1].patch('/sboxes/1/buckle-alarm', json={'enabled': False}).status_code == 502


def test_rest_snapshot_uses_fresh_same_device_live_setting(monkeypatch):
    from datetime import timedelta
    from app.services.monitoring_service import MonitoringService
    from app.telemetry.hub import telemetry_hub
    from app.utils.datetime_utils import utc_now_naive
    now = utc_now_naive()
    box = SimpleNamespace(box_id=888, serial_no='TEST', box_details=None, box_ip='test',
                          last_seen=now, hookA_threshold=50, hookB_threshold=50,
                          location_id=None, work_area_id=None)
    monkeypatch.setattr('app.services.monitoring_service.SboxRepository.get_location_name', lambda *a: None)
    monkeypatch.setattr('app.services.monitoring_service.SboxRepository.get_work_area_name', lambda *a: None)
    reading = parse_telemetry(json.dumps(packet(buckle_alarm_enabled=False)))
    payload = build_ws_payload(BoxMeta(888, 'TEST', None, 'test', 50, 50), reading, now)
    monkeypatch.setattr(telemetry_hub, 'latest_payloads', {888: payload})
    response = MonitoringService._build_telemetry_response(None, box, None)
    assert response['buckle_alarm_enabled'] is False
    assert response['buckle2'] == 1
    box.box_ip = 'replacement-device'
    assert MonitoringService._build_telemetry_response(None, box, None)['buckle_alarm_enabled'] is None
    box.box_ip = 'test'
    payload['recorded_at'] = (now - timedelta(hours=1)).isoformat()
    assert MonitoringService._build_telemetry_response(None, box, None)['buckle_alarm_enabled'] is None
