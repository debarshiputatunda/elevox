import json
import math
from dataclasses import dataclass

from app.core.telemetry_config import ESP_FINE_MAX, ESP_FINE_MIN
from app.utils.hook_ranges import validate_hook_ranges

V5_PROTOCOL = 'elevox-v5/1'


@dataclass(frozen=True)
class TelemetryReading:
    hook_a: int
    hook_b: int
    battery_percent: int
    battery_voltage: float
    buckle1: int
    buckle2: int
    buckle3: int
    alarm_active: int
    protocol: str = 'legacy-csv'
    alarm_cause: str = 'UNKNOWN'
    hook_a_valid: bool = True
    hook_b_valid: bool = True
    autonomous_hooks: bool = False
    device_threshold_a: int | None = None
    device_threshold_b: int | None = None
    hook_alarm_enabled: bool = False
    threshold_sync: str = 'backend-only'
    device_id: str | None = None
    threshold_edit_revision: int | None = None
    threshold_edit_pending: bool = False
    threshold_base_a: int | None = None
    threshold_base_b: int | None = None
    threshold_base_valid: bool = False
    buckle_alarm_enabled: bool | None = None
    hook_alarm_ranges: dict | None = None
    hook_ranges_revision: int | None = None
    hook_raw_a: int | None = None
    hook_raw_b: int | None = None
    # Display diagnostics only; never substitute for validated hook alarm inputs.
    guard: str | None = None
    sensing_mode: int | None = None
    sensing_name: str | None = None
    link: int | None = None
    mutual: int | None = None
    mutual_valid: bool | None = None
    mutual_status: str | None = None
    hook_observed_a: int | None = None
    hook_observed_b: int | None = None
    a_timeouts: int | None = None
    b_timeouts: int | None = None
    hook_sample_count: int | None = None
    hook_timeout_cycles: int | None = None


def _integer(value, name, minimum, maximum):
    if type(value) is not int or not minimum <= value <= maximum:
        raise ValueError(f'Invalid {name}')
    return value


def _boolean(value, name):
    if type(value) is not bool:
        raise ValueError(f'Invalid {name}: expected boolean')
    return value


def _voltage(value):
    if type(value) not in (int, float) or not math.isfinite(value) or not 0 <= value <= 20:
        raise ValueError('Invalid battery voltage')
    return float(value)


def _sensing_diagnostics(data):
    diagnostics = {}
    bounds = {
        'sensing_mode': (0, 2), 'link': (0, 2**32 - 1),
        'mutual': (0, 2**32 - 1),
        'hook_observed_a': (-1, 1000000), 'hook_observed_b': (-1, 1000000),
        'a_timeouts': (0, 16), 'b_timeouts': (0, 16),
        'hook_sample_count': (16, 16), 'hook_timeout_cycles': (800000, 800000),
    }
    for key, (minimum, maximum) in bounds.items():
        if data.get(key) is not None:
            diagnostics[key] = _integer(data[key], key, minimum, maximum)
    for key, choices in {
        'guard': ('HIGH', 'LOW', 'FLOAT'),
        'mutual_status': ('ok', 'reset_timeout', 'rise_timeout', 'below_resolution', 'waiting'),
    }.items():
        if data.get(key) is not None:
            if type(data[key]) is not str or data[key] not in choices:
                raise ValueError(f'Invalid {key}')
            diagnostics[key] = data[key]
    if data.get('sensing_name') is not None:
        if type(data['sensing_name']) is not str:
            raise ValueError('Invalid sensing_name')
        diagnostics['sensing_name'] = data['sensing_name']
    if data.get('mutual_valid') is not None:
        diagnostics['mutual_valid'] = _boolean(data['mutual_valid'], 'mutual_valid')
    return diagnostics


def parse_telemetry_csv(payload: str) -> TelemetryReading:
    fields = [part.strip() for part in payload.split(',')]
    device_id = None
    if len(fields) == 9:
        try:
            int(fields[0])
        except ValueError:
            device_id, fields = fields[0], fields[1:]
    if len(fields) != 8 or any(not field for field in fields):
        raise ValueError('Expected exactly 8 nonempty telemetry fields, optionally preceded by ID')
    a, b = [_integer(int(fields[i]), 'hook', -1, 1000000) for i in (0, 1)]
    buckles = [_integer(int(fields[i]), 'buckle', 0, 1) for i in (4, 5, 6)]
    alarm = _integer(int(fields[7]), 'alarm', 0, 1)
    return TelemetryReading(a, b, _integer(int(fields[2]), 'battery percent', 0, 100),
        _voltage(float(fields[3])), *buckles, alarm,
        alarm_cause='REMOTE' if alarm else 'BUCKLE' if any(buckles) else 'NONE',
        hook_a_valid=a >= 0, hook_b_valid=b >= 0, device_id=device_id)


def parse_telemetry(payload: str) -> TelemetryReading:
    if not payload.lstrip().startswith('{'):
        return parse_telemetry_csv(payload)
    try:
        data = json.loads(payload)
        protocol = data.get('protocol', 'legacy-v5-json')
        if protocol not in (V5_PROTOCOL, 'legacy-v5-json'):
            raise ValueError('Unsupported device protocol')
        a = _integer(data['raw1'], 'raw1', -1, 1000000)
        b = _integer(data['raw2'], 'raw2', -1, 1000000)
        buckles = [int(not _boolean(data[k], k)) for k in ('b1', 'b2', 'b3')]
        mode = data['mode']
        if mode not in ('NONE', 'MANUAL', 'HOOK', 'BUCKLE', 'SENSOR'):
            raise ValueError('Invalid alarm mode')
        _boolean(data['alarm'], 'alarm')
        managed = protocol == V5_PROTOCOL
        range_fields = ('hook_alarm_ranges', 'hook_ranges_revision', 'hook_raw_a', 'hook_raw_b')
        range_metadata = {}
        if any(key in data for key in range_fields):
            if not managed or not all(key in data for key in range_fields):
                raise ValueError('Incomplete hook range metadata')
            range_metadata = {
                'hook_alarm_ranges': validate_hook_ranges(data['hook_alarm_ranges']),
                'hook_ranges_revision': _integer(data['hook_ranges_revision'], 'hook_ranges_revision', 0, 2**32 - 1),
                'hook_raw_a': _integer(data['hook_raw_a'], 'hook_raw_a', -1, 1000000),
                'hook_raw_b': _integer(data['hook_raw_b'], 'hook_raw_b', -1, 1000000),
            }
        edit_fields = ('threshold_edit_revision', 'threshold_edit_pending',
                       'threshold_base_a', 'threshold_base_b', 'threshold_base_valid')
        edit_metadata = {}
        if not range_metadata and any(key in data for key in edit_fields):
            if not managed or not all(key in data for key in edit_fields):
                raise ValueError('Incomplete threshold edit metadata')
            edit_metadata = {
                'threshold_edit_revision': _integer(data['threshold_edit_revision'],
                                                   'threshold_edit_revision', 0, 2**32 - 1),
                'threshold_edit_pending': _boolean(data['threshold_edit_pending'], 'threshold_edit_pending'),
                'threshold_base_a': _integer(data['threshold_base_a'], 'threshold_base_a', 0, 100000),
                'threshold_base_b': _integer(data['threshold_base_b'], 'threshold_base_b', 0, 100000),
                'threshold_base_valid': _boolean(data['threshold_base_valid'], 'threshold_base_valid'),
            }
        valid_a = _boolean(data['hook_a_valid'], 'hook_a_valid') if managed else a >= 0
        valid_b = _boolean(data['hook_b_valid'], 'hook_b_valid') if managed else b >= 0
        if valid_a != (a >= 0) or valid_b != (b >= 0):
            raise ValueError('Hook value and validity disagree')
        return TelemetryReading(a, b,
            _integer(data['batt_pct'], 'batt_pct', 0, 100), _voltage(data['batt_v']),
            *buckles, int(mode != 'NONE'), protocol=protocol, alarm_cause=mode,
            hook_a_valid=valid_a, hook_b_valid=valid_b,
            autonomous_hooks=managed,
            device_threshold_a=_integer(data['threshold_a'], 'threshold_a', 0, 100000) if managed and not range_metadata else None,
            device_threshold_b=_integer(data['threshold_b'], 'threshold_b', 0, 100000) if managed and not range_metadata else None,
            hook_alarm_enabled=_boolean(data['hook_alarm_enabled'], 'hook_alarm_enabled') if managed else False,
            threshold_sync='device-owned' if range_metadata else 'pending' if managed else 'unsupported', device_id=data['id'],
            buckle_alarm_enabled=_boolean(data['buckle_alarm_enabled'], 'buckle_alarm_enabled')
                if 'buckle_alarm_enabled' in data else None,
            **edit_metadata, **range_metadata, **_sensing_diagnostics(data))
    except (KeyError, TypeError) as exc:
        raise ValueError('Incomplete device telemetry') from exc


def raw_hook_to_percent(raw_value: int) -> float:
    span = ESP_FINE_MAX - ESP_FINE_MIN
    if span <= 0:
        return 0.0
    return max(0.0, min(((raw_value - ESP_FINE_MIN) / span) * 100.0, 100.0))


def is_hook_threshold_exceeded(raw_value: int, threshold: int) -> bool:
    return raw_value >= threshold


def is_buckle_open(value: int) -> bool:
    return value == 1
