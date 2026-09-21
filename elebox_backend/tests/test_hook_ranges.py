import json
from datetime import datetime
from urllib.parse import parse_qs
from unittest.mock import AsyncMock

import httpx
import pytest

from app.utils.telemetry_parser import parse_telemetry
from app.services.notification_engine import NotificationEngine
from app.telemetry.payload import build_ws_payload
from app.telemetry.events import BoxMeta
from tests.test_v5_protocol import packet
from tests.test_buckle_alarm import api, mock_device

RANGES = {'a': [[10, 1800], [10000, 1000000]], 'b': [[10, 1800], [10000, 1000000]]}

def ranged(**kw):
    return packet(hook_alarm_ranges=RANGES, hook_ranges_revision=2,
                  hook_raw_a=1800, hook_raw_b=10000, mode='NONE', **kw)


def test_parser_and_payload_preserve_range_contract():
    reading = parse_telemetry(json.dumps(ranged()))
    payload = build_ws_payload(BoxMeta(1, 'TEST', None, 'test', 50, 50), reading, datetime.now())
    assert payload['hook_alarm_ranges'] == RANGES
    assert payload['hook_ranges_revision'] == 2
    assert payload['hook_raw_a'] == 1800
    assert payload['hook_raw_b'] == 10000
    assert reading.threshold_sync == 'device-owned'

@pytest.mark.parametrize('field,value', [('hook_ranges_revision', True), ('hook_ranges_revision', -1), ('hook_raw_a', 1.1), ('hook_raw_b', None), ('hook_alarm_ranges', {'a': [[1, 10], [10, 20]], 'b': RANGES['b']})])
def test_malformed_range_contract_rejected(field, value):
    data = ranged()
    data[field] = value
    with pytest.raises(ValueError):
        parse_telemetry(json.dumps(data))

@pytest.mark.asyncio
@pytest.mark.parametrize('a,b,violation', [(10,1800,True),(10000,1000000,True),(1801,12000,False),(12000,9999,False),(-1,12000,False)])
async def test_notifications_use_both_fresh_raw_ranges(monkeypatch,a,b,violation):
    data = ranged()
    data.update(hook_raw_a=a, hook_raw_b=b, raw1=12000 if a>=0 else -1, hook_a_valid=a>=0)
    engine=NotificationEngine()
    emitted=[]
    monkeypatch.setattr(engine,'_emit',lambda *args,**kw: emitted.append(kw['title']) or {})
    monkeypatch.setattr('app.services.notification_engine.telemetry_ws_manager.broadcast_to_all',AsyncMock())
    pulse=AsyncMock()
    monkeypatch.setattr('app.services.notification_engine.esp_alarm_controller.request_pulse',pulse)
    await engine.process_reading(None,box_id=1,controller_name='TEST',reading=parse_telemetry(json.dumps(data)),hook_a_threshold=50,hook_b_threshold=50,box_ip='test')
    assert ('Hook Alarm Ranges Matched' in emitted) is violation
    assert not any('Threshold Exceeded' in title for title in emitted)
    pulse.assert_not_awaited()


def test_patch_saves_exact_device_contract(api,monkeypatch):
    def handler(req):
        assert req.url.path == '/hook-ranges'
        form=parse_qs(req.content.decode())
        assert form['a0_min']==['10'] and form['b1_max']==['1000000'] and form['expected_revision']==['2']
        return httpx.Response(200,json={'saved':True,'hook_alarm_ranges':RANGES,'hook_ranges_revision':3})
    mock_device(monkeypatch,handler)
    response=api[1].patch('/sboxes/1/hook-ranges',json={**RANGES,'expected_revision':2})
    assert response.status_code==200
    assert response.json()['confirmed'] is True
    assert response.json()['hook_ranges_revision']==3

@pytest.mark.parametrize('body',[{**RANGES,'expected_revision':True},{**RANGES,'a':[[1,10],[10,20]],'expected_revision':2},{**RANGES,'a':[[1.0,2],[3,4]],'expected_revision':2},{**RANGES,'expected_revision':2,'extra':1}])
def test_patch_rejects_invalid_ranges(api,body):
    assert api[1].patch('/sboxes/1/hook-ranges',json=body).status_code==422

@pytest.mark.parametrize('reply',[{'saved':True,'hook_alarm_ranges':RANGES,'hook_ranges_revision':4},{'saved':True,'hook_alarm_ranges':RANGES,'hook_ranges_revision':True},{'saved':False,'hook_alarm_ranges':RANGES,'hook_ranges_revision':3}])
def test_patch_rejects_unconfirmed_ack(api,monkeypatch,reply):
    mock_device(monkeypatch,lambda req:httpx.Response(200,json=reply))
    assert api[1].patch('/sboxes/1/hook-ranges',json={**RANGES,'expected_revision':2}).status_code==502


def test_patch_conflict_and_permission(api,monkeypatch):
    mock_device(monkeypatch,lambda req:httpx.Response(409))
    assert api[1].patch('/sboxes/1/hook-ranges',json={**RANGES,'expected_revision':2}).status_code==409
    monkeypatch.setattr('app.middlewares.auth_middleware._get_user_role_names',lambda *a:{'Employee'})
    assert api[1].patch('/sboxes/1/hook-ranges',json={**RANGES,'expected_revision':2}).status_code==403

@pytest.mark.asyncio
async def test_range_device_never_runs_legacy_threshold_sync(monkeypatch):
    from app.telemetry.device_poller import DevicePoller
    poller=DevicePoller(BoxMeta(1,'TEST',None,'test',50,50),None,get_health=lambda _:None,get_interval=lambda _:0.1,should_notify_failure=lambda *a:False)
    monkeypatch.setattr(poller,'_current_thresholds',lambda *a:pytest.fail('Legacy thresholds accessed'))
    reading=parse_telemetry(json.dumps(ranged()))
    assert await poller._reconcile_thresholds(reading) is reading

@pytest.mark.asyncio
async def test_poll_start_cadence_subtracts_request_time_and_never_overlaps(monkeypatch):
    from app.telemetry.device_poller import DevicePoller
    from app.telemetry.health import DeviceHealthMetrics
    clock=[0.0]
    starts=[]
    sleeps=[]
    active=[False]
    health=DeviceHealthMetrics(box_id=1)
    poller=DevicePoller(BoxMeta(1,'TEST',None,'test',50,50),None,get_health=lambda _:health,get_interval=lambda _:0.1,should_notify_failure=lambda *a:False)
    async def fetch(*a,**kw):
        assert not active[0]
        active[0]=True
        starts.append(clock[0])
        clock[0]+=0.04
        active[0]=False
        return parse_telemetry(json.dumps(ranged()))
    async def sleep(delay):
        sleeps.append(delay)
        clock[0]+=delay
        if len(starts)==3: poller._stop_event.set()
    monkeypatch.setattr('app.telemetry.device_poller.time.perf_counter',lambda:clock[0])
    monkeypatch.setattr('app.telemetry.device_poller.fetch_esp_telemetry',fetch)
    monkeypatch.setattr('app.telemetry.device_poller.asyncio.sleep',sleep)
    monkeypatch.setattr('app.telemetry.device_poller.telemetry_hub.publish_success',AsyncMock())
    await poller._run()
    assert starts==pytest.approx([0,0.1,0.2])
    assert sleeps==pytest.approx([0.06]*3)


def test_rest_ranges_are_only_from_fresh_same_device_cache(monkeypatch):
    from datetime import timedelta
    from types import SimpleNamespace
    from app.services.monitoring_service import MonitoringService
    from app.telemetry.hub import telemetry_hub
    from app.utils.datetime_utils import utc_now_naive
    from app.schemas.telemetry_schema import TelemetrySnapshotResponse
    now=utc_now_naive()
    box=SimpleNamespace(box_id=998,serial_no='TEST',box_details=None,box_ip='test',last_seen=now,hookA_threshold=50,hookB_threshold=50,location_id=None,work_area_id=None)
    monkeypatch.setattr('app.services.monitoring_service.SboxRepository.get_location_name',lambda *a:None)
    monkeypatch.setattr('app.services.monitoring_service.SboxRepository.get_work_area_name',lambda *a:None)
    live=build_ws_payload(BoxMeta(998,'TEST',None,'test',50,50),parse_telemetry(json.dumps(ranged())),now)
    monkeypatch.setattr(telemetry_hub,'latest_payloads',{998:live})
    response=TelemetrySnapshotResponse.model_validate(MonitoringService._build_telemetry_response(None,box,None))
    assert response.hook_alarm_ranges==RANGES and response.hook_raw_a==1800
    live['recorded_at']=(now-timedelta(hours=1)).isoformat()
    assert MonitoringService._build_telemetry_response(None,box,None).get('hook_alarm_ranges') is None
    live['recorded_at']=now.isoformat()
    box.box_ip='other'
    assert MonitoringService._build_telemetry_response(None,box,None).get('hook_alarm_ranges') is None


@pytest.mark.parametrize('expected,confirmed',[(2,2),(2**32-1,1)])
def test_patch_accepts_noop_and_revision_wrap(api,monkeypatch,expected,confirmed):
    mock_device(monkeypatch,lambda req:httpx.Response(200,json={'saved':True,'hook_alarm_ranges':RANGES,'hook_ranges_revision':confirmed}))
    response=api[1].patch('/sboxes/1/hook-ranges',json={**RANGES,'expected_revision':expected})
    assert response.status_code==200
    assert response.json()['hook_ranges_revision']==confirmed

@pytest.mark.asyncio
async def test_legacy_synchronizer_cannot_write_ranges_device():
    from app.utils.threshold_sync import ThresholdSynchronizer
    client=AsyncMock()
    reading=parse_telemetry(json.dumps(ranged()))
    assert await ThresholdSynchronizer().reconcile(client,'test',reading,50,50) is reading
    client.post.assert_not_awaited()
