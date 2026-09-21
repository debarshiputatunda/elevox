"""Device-owned, inclusive hook alarm ranges shared by telemetry and commands."""


def validate_hook_ranges(value):
    if not isinstance(value, dict) or set(value) != {'a', 'b'}:
        raise ValueError('Expected ranges for hooks a and b')
    for intervals in value.values():
        if not isinstance(intervals, (list, tuple)) or len(intervals) != 2:
            raise ValueError('Each hook requires two ranges')
        for pair in intervals:
            if (not isinstance(pair, (list, tuple)) or len(pair) != 2
                    or any(type(v) is not int or not 0 <= v <= 1000000 for v in pair)
                    or pair[0] > pair[1]):
                raise ValueError('Range bounds must be ordered integers from 0 to 1000000')
        if intervals[0][1] >= intervals[1][0]:
            raise ValueError('Ranges must be ordered and nonoverlapping')
    return {key: [list(pair) for pair in value[key]] for key in ('a', 'b')}


def both_hooks_in_ranges(reading):
    ranges = reading.hook_alarm_ranges
    return bool(ranges is not None and reading.hook_a_valid and reading.hook_b_valid
                and all(type(raw) is int and raw >= 0
                        and any(low <= raw <= high for low, high in ranges[key])
                        for key, raw in (('a', reading.hook_raw_a), ('b', reading.hook_raw_b))))
