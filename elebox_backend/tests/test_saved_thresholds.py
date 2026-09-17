from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

import app.models
from app.core.database import Base
from app.models.box_details import BoxDetail
from app.schemas.sbox_schema import SBoxThresholdUpdateRequest
from app.services.sbox_service import SboxService
from app.services.notification_engine import NotificationEngine
from app.telemetry.events import BoxMeta, PersistenceEvent
from app.telemetry.hub import TelemetryHub
from app.telemetry.orchestrator import TelemetryOrchestrator
from app.utils.telemetry_parser import TelemetryReading


@pytest.mark.asyncio
async def test_queued_reading_uses_newly_saved_thresholds(monkeypatch):
    engine = create_engine('sqlite://')
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        db.add(BoxDetail(box_id=1, box_ip='127.0.0.1', hookA_threshold=50,
                         hookB_threshold=50, activity_status=1))
        db.commit()
        # A reading was already queued under the old thresholds.
        event = PersistenceEvent(kind='reading', box_id=1,
            reading=TelemetryReading(12000, 12000, 80, 4.0, 0, 0, 0, 0),
            box=BoxMeta(1, 'TEST', None, '127.0.0.1', 50, 50),
            hook_a_threshold=50, hook_b_threshold=50, recorded_at=datetime.now())
        SboxService.update_thresholds(db, 1, SBoxThresholdUpdateRequest(
            hookA_threshold=20000, hookB_threshold=20000))
    monkeypatch.setattr('app.telemetry.hub.SessionLocal', lambda: Session(engine))
    evaluate = AsyncMock()
    monkeypatch.setattr('app.telemetry.hub.notification_engine.process_reading', evaluate)
    await TelemetryHub()._handle_reading(event)
    assert evaluate.await_args.kwargs['hook_a_threshold'] == 20000
    assert evaluate.await_args.kwargs['hook_b_threshold'] == 20000
    engine.dispose()


@pytest.mark.asyncio
async def test_registry_preserves_zero_threshold(monkeypatch):
    db = SimpleNamespace(close=lambda: None)
    box = SimpleNamespace(box_id=1, serial_no='TEST', box_details=None,
                          box_ip='127.0.0.1', hookA_threshold=0, hookB_threshold=0)
    monkeypatch.setattr('app.telemetry.orchestrator.SessionLocal', lambda: db)
    monkeypatch.setattr('app.telemetry.orchestrator.TelemetryRepository.get_active_boxes',
                        lambda db: [box])
    monkeypatch.setattr('app.telemetry.orchestrator.DevicePoller.start', AsyncMock())
    orchestrator = TelemetryOrchestrator()
    orchestrator._client = object()
    await orchestrator._sync_devices()
    assert orchestrator._pollers[1].box.hook_a_threshold == 0
    assert orchestrator._pollers[1].box.hook_b_threshold == 0


@pytest.mark.asyncio
@pytest.mark.parametrize('threshold_a,threshold_b,should_pulse', [
    (20000, 20000, False), (20000, 50, False), (12000, 12000, True),
])
async def test_dual_hook_alarm_obeys_both_raw_thresholds(
    monkeypatch, threshold_a, threshold_b, should_pulse,
):
    engine = NotificationEngine()
    monkeypatch.setattr(engine, '_emit', lambda *args, **kwargs: {})
    monkeypatch.setattr('app.services.notification_engine.telemetry_ws_manager.broadcast_to_all',
                        AsyncMock())
    pulse = AsyncMock()
    monkeypatch.setattr('app.services.notification_engine.esp_alarm_controller.request_pulse', pulse)
    await engine.process_reading(None, box_id=1, controller_name='TEST',
        reading=TelemetryReading(12000, 12000, 80, 4.0, 0, 0, 0, 0),
        hook_a_threshold=threshold_a, hook_b_threshold=threshold_b, box_ip='127.0.0.1')
    assert pulse.await_count == int(should_pulse)


def test_partial_threshold_edit_preserves_the_other_saved_hook():
    engine = create_engine('sqlite://')
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        db.add(BoxDetail(box_id=1, box_ip='test', hookA_threshold=20000,
                        hookB_threshold=3870, activity_status=1))
        db.commit()
        SboxService.update_thresholds(db, 1, SBoxThresholdUpdateRequest(hookB_threshold=21000))
        box = db.get(BoxDetail, 1)
        assert (box.hookA_threshold, box.hookB_threshold) == (20000, 21000)
    engine.dispose()
