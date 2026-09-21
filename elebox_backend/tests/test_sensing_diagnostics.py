import json
from datetime import datetime, timezone

import pytest

from app.schemas.telemetry_schema import TelemetrySnapshotResponse
from app.telemetry.events import BoxMeta
from app.telemetry.payload import build_ws_payload
from app.utils.telemetry_parser import parse_telemetry
from app.utils.hook_ranges import both_hooks_in_ranges
from tests.test_v5_protocol import packet

DIAGNOSTICS = dict(guard='HIGH', sensing_mode=2, sensing_name='HIGH', link=0,
    mutual=0, mutual_valid=False, mutual_status='rise_timeout',
    hook_observed_a=1540, hook_observed_b=-1, a_timeouts=4, b_timeouts=16,
    hook_sample_count=16, hook_timeout_cycles=800000)


def response(data):
    reading = parse_telemetry(json.dumps(data))
    payload = build_ws_payload(BoxMeta(1, 'TEST', None, 'test', 50, 50), reading,
                               datetime.now(timezone.utc))
    return reading, TelemetrySnapshotResponse(**payload).model_dump()


def test_partial_high_samples_reach_clients_without_becoming_valid_alarm_inputs():
    reading, result = response(packet(**DIAGNOSTICS, raw1=-1, raw2=-1,
        hook_a_valid=False, hook_b_valid=False, hook_raw_a=-1, hook_raw_b=-1,
        hook_alarm_ranges={'a': [[1, 2000], [3000, 4000]], 'b': [[1, 2000], [3000, 4000]]}, hook_ranges_revision=1))
    assert result['hook_observed_a'] == 1540
    assert result['hook_observed_b'] == -1
    assert result['hook_raw_a'] == -1 and result['hook_a_valid'] is False
    assert not both_hooks_in_ranges(reading)
    assert all(result[key] == value for key, value in DIAGNOSTICS.items())


def test_link_zero_and_absent_legacy_diagnostics_remain_distinct():
    _, result = response(packet(link=0, mutual=0, mutual_valid=True))
    assert result['link'] == 0 and result['mutual'] == 0 and result['mutual_valid'] is True
    for data in (packet(), packet(**{key: None for key in DIAGNOSTICS})):
        _, legacy = response(data)
        assert all(legacy[key] is None for key in DIAGNOSTICS)


@pytest.mark.parametrize('field,value', [
    ('guard','invalid'), ('sensing_mode', True), ('sensing_mode',3), ('sensing_name', 2),
    ('link', -1), ('link', 1.2), ('mutual', True), ('mutual_valid', 1),
    ('mutual_status','timeout'), ('hook_observed_a',-2), ('hook_observed_b',1.5),
    ('a_timeouts',17), ('b_timeouts',-1), ('hook_sample_count',15),
    ('hook_timeout_cycles',0),
])
def test_present_diagnostics_are_strictly_validated(field, value):
    with pytest.raises(ValueError):
        parse_telemetry(json.dumps(packet(**{field:value})))


def test_rest_diagnostics_require_fresh_same_device_packet(monkeypatch):
    from datetime import timedelta
    from types import SimpleNamespace
    from app.services.monitoring_service import MonitoringService
    from app.telemetry.hub import telemetry_hub
    now = datetime.now(timezone.utc)
    box = SimpleNamespace(box_id=1, serial_no='TEST', box_details=None, box_ip='test',
        last_seen=now, hookA_threshold=50, hookB_threshold=50, location_id=None, work_area_id=None)
    monkeypatch.setattr('app.services.monitoring_service.SboxRepository.get_location_name', lambda *a: None)
    monkeypatch.setattr('app.services.monitoring_service.SboxRepository.get_work_area_name', lambda *a: None)
    _, live = response(packet(**DIAGNOSTICS))
    monkeypatch.setattr(telemetry_hub, 'latest_payloads', {1: live})

    def rest():
        return TelemetrySnapshotResponse.model_validate(
            MonitoringService._build_telemetry_response(None, box, None))

    assert rest().link == 0 and rest().hook_observed_a == 1540
    live['recorded_at'] = (now - timedelta(hours=1)).isoformat()
    assert rest().link is None and rest().hook_observed_a is None
    live['recorded_at'] = now.isoformat()
    box.box_ip = 'different-device'
    assert rest().link is None and rest().mutual_valid is None


def test_legacy_v5_float_guard_remains_readable():
    reading, result = response(packet(guard='FLOAT'))
    assert result['guard'] == 'FLOAT'
    assert reading.hook_a_valid is True and reading.hook_a == 12000
