"""Unit tests for the pulse + cooldown ESP dual-hook alarm scheduler."""

from __future__ import annotations

import asyncio
from unittest.mock import patch

import pytest

from app.telemetry.esp_alarm_controller import EspAlarmController


@pytest.mark.asyncio
async def test_first_violation_fires_single_pulse():
    controller = EspAlarmController(cooldown_s=10.0)
    calls: list[int] = []

    async def fake_trigger(_client, _box_ip, box_id=None):
        calls.append(box_id)

    with patch("app.telemetry.esp_alarm_controller.trigger_esp_alarm", side_effect=fake_trigger):
        launched = await controller.request_pulse(1, box_ip="10.0.0.5")
        await asyncio.sleep(0.02)

    assert launched is True
    assert calls == [1]


@pytest.mark.asyncio
async def test_no_repeat_pulse_within_cooldown():
    controller = EspAlarmController(cooldown_s=10.0)
    calls: list[int] = []

    async def fake_trigger(_client, _box_ip, box_id=None):
        calls.append(box_id)

    with patch("app.telemetry.esp_alarm_controller.trigger_esp_alarm", side_effect=fake_trigger):
        # First reading fires; subsequent readings within cooldown are gated.
        await controller.request_pulse(2, box_ip="10.0.0.5")
        await asyncio.sleep(0.02)
        for _ in range(20):
            await controller.request_pulse(2, box_ip="10.0.0.5")
        await asyncio.sleep(0.02)

    assert calls == [2]


@pytest.mark.asyncio
async def test_repeat_pulse_after_cooldown_elapses():
    controller = EspAlarmController(cooldown_s=0.05)
    calls: list[int] = []

    async def fake_trigger(_client, _box_ip, box_id=None):
        calls.append(box_id)

    with patch("app.telemetry.esp_alarm_controller.trigger_esp_alarm", side_effect=fake_trigger):
        await controller.request_pulse(3, box_ip="10.0.0.5")
        await asyncio.sleep(0.02)
        # Still within cooldown — no new pulse.
        await controller.request_pulse(3, box_ip="10.0.0.5")
        await asyncio.sleep(0.02)
        assert calls == [3]
        # Cooldown elapses — next request pulses again.
        await asyncio.sleep(0.06)
        await controller.request_pulse(3, box_ip="10.0.0.5")
        await asyncio.sleep(0.02)

    assert calls == [3, 3]


@pytest.mark.asyncio
async def test_clear_then_new_violation_after_cooldown_pulses_again():
    controller = EspAlarmController(cooldown_s=0.05)
    calls: list[int] = []

    async def fake_trigger(_client, _box_ip, box_id=None):
        calls.append(box_id)

    with patch("app.telemetry.esp_alarm_controller.trigger_esp_alarm", side_effect=fake_trigger):
        await controller.request_pulse(4, box_ip="10.0.0.5")
        await asyncio.sleep(0.02)
        # Violation clears: notification engine simply stops calling request_pulse.
        # No OFF command is ever sent (nothing to assert but absence of extra calls).
        await asyncio.sleep(0.06)
        # New violation after cooldown → pulses again.
        await controller.request_pulse(4, box_ip="10.0.0.5")
        await asyncio.sleep(0.02)

    assert calls == [4, 4]


@pytest.mark.asyncio
async def test_concurrent_requests_single_pulse_in_flight():
    controller = EspAlarmController(cooldown_s=10.0)
    calls: list[int] = []

    async def fake_trigger(_client, _box_ip, box_id=None):
        calls.append(box_id)
        await asyncio.sleep(0.05)  # keep the pulse in flight

    with patch("app.telemetry.esp_alarm_controller.trigger_esp_alarm", side_effect=fake_trigger):
        # Fire many concurrent requests while the first is still in flight.
        results = await asyncio.gather(
            *(controller.request_pulse(5, box_ip="10.0.0.5") for _ in range(10))
        )
        await asyncio.sleep(0.1)

    assert calls == [5]
    assert sum(1 for r in results if r) == 1


@pytest.mark.asyncio
async def test_on_success_called_once_per_pulse():
    controller = EspAlarmController(cooldown_s=0.05)
    successes: list[int] = []

    async def fake_trigger(_client, _box_ip, box_id=None):
        return None

    def on_success():
        successes.append(1)

    with patch("app.telemetry.esp_alarm_controller.trigger_esp_alarm", side_effect=fake_trigger):
        await controller.request_pulse(6, box_ip="10.0.0.5", on_success=on_success)
        await asyncio.sleep(0.02)
        await asyncio.sleep(0.06)
        await controller.request_pulse(6, box_ip="10.0.0.5", on_success=on_success)
        await asyncio.sleep(0.02)

    assert successes == [1, 1]


@pytest.mark.asyncio
async def test_failed_pulse_does_not_start_cooldown():
    controller = EspAlarmController(cooldown_s=10.0)
    calls: list[int] = []

    async def flaky_trigger(_client, _box_ip, box_id=None):
        calls.append(box_id)
        if len(calls) == 1:
            raise RuntimeError("ESP unreachable")

    with patch("app.telemetry.esp_alarm_controller.trigger_esp_alarm", side_effect=flaky_trigger):
        await controller.request_pulse(7, box_ip="10.0.0.5")
        await asyncio.sleep(0.02)
        # First attempt failed → no cooldown set → next reading retries immediately.
        await controller.request_pulse(7, box_ip="10.0.0.5")
        await asyncio.sleep(0.02)

    assert calls == [7, 7]
    assert controller.get_last_triggered_at(7) is not None
