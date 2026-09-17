import json
from urllib.parse import parse_qs

import httpx
import pytest
from sqlalchemy import create_engine, update
from sqlalchemy.orm import Session

import app.models
from app.core.database import Base
from app.models.box_details import BoxDetail
from app.telemetry.device_poller import DevicePoller
from app.telemetry.events import BoxMeta
from app.utils.telemetry_parser import parse_telemetry
from app.utils.threshold_sync import ThresholdSynchronizer
from test_v5_protocol import packet


def editable_packet(**changes):
    return packet(threshold_edit_revision=7, threshold_edit_pending=True,
                  threshold_base_a=50, threshold_base_b=50,
                  threshold_base_valid=True) | changes


def reading(**changes):
    return parse_telemetry(json.dumps(editable_packet(**changes)))


def test_parses_edit_metadata_and_legacy_absence():
    current = reading()
    assert current.threshold_edit_revision == 7
    assert current.threshold_edit_pending is True
    assert (current.threshold_base_a, current.threshold_base_b) == (50, 50)
    assert current.threshold_base_valid is True
    assert parse_telemetry(json.dumps(packet())).threshold_edit_revision is None


@pytest.mark.parametrize('changes', [
    {'threshold_edit_revision': -1}, {'threshold_edit_revision': 2**32},
    {'threshold_edit_revision': True}, {'threshold_edit_pending': 1},
    {'threshold_base_a': -1}, {'threshold_base_b': 100001},
    {'threshold_base_valid': 'true'},
])
def test_rejects_invalid_edit_metadata(changes):
    with pytest.raises(ValueError):
        reading(**changes)


@pytest.mark.parametrize('missing', [
    'threshold_edit_revision', 'threshold_edit_pending', 'threshold_base_a',
    'threshold_base_b', 'threshold_base_valid',
])
def test_rejects_partial_edit_metadata(missing):
    payload = editable_packet()
    del payload[missing]
    with pytest.raises(ValueError):
        parse_telemetry(json.dumps(payload))


@pytest.fixture
def database(tmp_path, monkeypatch):
    engine = create_engine(f'sqlite:///{tmp_path / "thresholds.db"}')
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        db.add(BoxDetail(box_id=1, box_ip='device', hookA_threshold=50,
                         hookB_threshold=50, activity_status=1))
        db.commit()
    monkeypatch.setattr('app.telemetry.device_poller.SessionLocal', lambda: Session(engine))
    yield engine
    engine.dispose()


def poller(client=None):
    return DevicePoller(BoxMeta(1, 'TEST', None, 'device', 1, 1), client,
                        get_health=lambda _: None, get_interval=lambda _: 1,
                        should_notify_failure=lambda *_: False)


def saved(engine):
    with Session(engine) as db:
        box = db.get(BoxDetail, 1)
        return box.hookA_threshold, box.hookB_threshold


@pytest.mark.parametrize('changes,expected', [
    ({}, (20000, 21000)),
    ({'threshold_base_valid': False}, (50, 50)),
    ({'threshold_base_a': 51}, (50, 50)),
    ({'threshold_edit_pending': False}, (50, 50)),
])
def test_device_import_requires_pending_edit_and_matching_baseline(database, changes, expected):
    assert poller()._current_thresholds(reading(**changes)) == expected
    assert saved(database) == expected


def test_website_edit_before_import_wins_both_thresholds(database):
    with Session(database) as db:
        db.execute(update(BoxDetail).values(hookA_threshold=8000))
        db.commit()
    assert poller()._current_thresholds(reading()) == (8000, 50)
    assert saved(database) == (8000, 50)


def test_website_edit_after_import_commit_is_reloaded(database, monkeypatch):
    class WebsiteRaceSession(Session):
        def commit(self):
            super().commit()
            with Session(database) as other:
                other.execute(update(BoxDetail).values(hookA_threshold=9000))
                other.commit()
    monkeypatch.setattr('app.telemetry.device_poller.SessionLocal',
                        lambda: WebsiteRaceSession(database))
    assert poller()._current_thresholds(reading()) == (9000, 21000)


@pytest.mark.asyncio
async def test_failed_database_persistence_never_acknowledges_device(database, monkeypatch):
    class FailedSession(Session):
        def commit(self):
            raise RuntimeError('Database unavailable')
    monkeypatch.setattr('app.telemetry.device_poller.SessionLocal', lambda: FailedSession(database))
    def unexpected(request):
        pytest.fail('An unpersisted edit must not be overwritten or acknowledged')
    async with httpx.AsyncClient(transport=httpx.MockTransport(unexpected)) as client:
        result = await poller(client)._reconcile_thresholds(reading())
    assert result.threshold_sync == 'error'
    assert result.threshold_edit_pending is True
    assert saved(database) == (50, 50)


@pytest.mark.asyncio
async def test_import_and_pending_ack_retry(database):
    requests = []
    def handler(request):
        requests.append(parse_qs(request.content.decode()))
        return httpx.Response(503 if len(requests) == 1 else 200, json={'saved': True})
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        worker = poller(client)
        worker._threshold_sync = ThresholdSynchronizer(retry_seconds=0)
        first = await worker._reconcile_thresholds(reading())
        assert first.threshold_sync == 'error'
        assert saved(database) == (20000, 21000)
        second = await worker._reconcile_thresholds(reading())
        assert second.threshold_sync == 'pending'
        assert len(requests) == 2
        assert requests[1] == {'threshold_a': ['20000'], 'threshold_b': ['21000'],
                               'expected_revision': ['7']}
        confirmed = await worker._reconcile_thresholds(reading(
            threshold_edit_pending=False, threshold_base_a=20000, threshold_base_b=21000))
        assert confirmed.threshold_sync == 'synced'
        assert len(requests) == 2


@pytest.mark.asyncio
async def test_revision_conflict_preserves_pending_and_new_revision_retries_immediately():
    requests = []
    def handler(request):
        requests.append(parse_qs(request.content.decode()))
        return httpx.Response(409 if len(requests) == 1 else 200, json={'saved': True})
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        sync = ThresholdSynchronizer(retry_seconds=3600)
        first = await sync.reconcile(client, 'device', reading(), 50, 50)
        assert first.threshold_sync == 'error'
        second = await sync.reconcile(client, 'device', reading(threshold_edit_revision=8), 50, 50)
        assert second.threshold_sync == 'pending'
        assert requests[1]['expected_revision'] == ['8']


@pytest.mark.asyncio
async def test_matching_values_without_valid_baseline_still_establish_baseline():
    requests = []
    async with httpx.AsyncClient(transport=httpx.MockTransport(
        lambda request: requests.append(request) or httpx.Response(200, json={'saved': True}))) as client:
        result = await ThresholdSynchronizer().reconcile(client, 'device', reading(
            threshold_edit_pending=False, threshold_base_valid=False), 20000, 21000)
    assert result.threshold_sync == 'pending'
    assert len(requests) == 1


def test_website_save_at_import_boundary_is_not_overwritten(database, monkeypatch):
    class RacingSession(Session):
        def execute(self, statement, *args, **kwargs):
            if getattr(statement, 'is_update', False):
                with Session(database) as website:
                    website.execute(update(BoxDetail).values(hookB_threshold=94721))
                    website.commit()
            return super().execute(statement, *args, **kwargs)
    monkeypatch.setattr('app.telemetry.device_poller.SessionLocal', lambda: RacingSession(database))
    assert poller()._current_thresholds(reading()) == (50, 94721)
    assert saved(database) == (50, 94721)


def test_import_preserves_zero_and_handles_database_default(database):
    with Session(database) as db:
        db.execute(update(BoxDetail).values(hookA_threshold=None, hookB_threshold=None))
        db.commit()
    assert poller()._current_thresholds(reading(threshold_a=0, threshold_b=100000)) == (0, 100000)
    assert saved(database) == (0, 100000)


@pytest.mark.parametrize('changes', [{'activity_status': 0}, {'box_ip': 'replacement'}])
def test_inactive_or_reassigned_device_cannot_import(database, changes):
    with Session(database) as db:
        db.execute(update(BoxDetail).values(**changes))
        db.commit()
    assert poller()._current_thresholds(reading()) is None
    assert saved(database) == (50, 50)


@pytest.mark.asyncio
@pytest.mark.parametrize('website_edit', [False, True])
async def test_new_device_edit_after_stale_ack_preserved_unless_website_changed(database, website_edit):
    requests = []
    def handler(request):
        requests.append(parse_qs(request.content.decode()))
        return httpx.Response(409 if len(requests) == 1 else 200, json={'saved': True})
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        worker = poller(client)
        first = await worker._reconcile_thresholds(reading())
        assert first.threshold_sync == 'error'
        assert saved(database) == (20000, 21000)
        if website_edit:
            with Session(database) as db:
                db.execute(update(BoxDetail).values(hookA_threshold=9000))
                db.commit()
        second = await worker._reconcile_thresholds(reading(
            threshold_edit_revision=8, threshold_a=30000, threshold_b=31000))
        expected = (9000, 21000) if website_edit else (30000, 31000)
        assert saved(database) == expected
        assert requests[-1] == {'threshold_a': [str(expected[0])],
                               'threshold_b': [str(expected[1])], 'expected_revision': ['8']}
        assert second.threshold_sync == 'pending'


@pytest.mark.parametrize('reset', ['ack', 'device', 'address', 'website'])
def test_prior_import_provenance_is_reset(database, reset):
    worker = poller()
    worker._current_thresholds(reading())
    if reset == 'ack':
        worker._current_thresholds(reading(threshold_edit_pending=False,
                                          threshold_base_a=20000, threshold_base_b=21000))
    elif reset == 'device':
        worker._current_thresholds(reading(id='NEW', threshold_edit_pending=False))
    elif reset == 'address':
        worker.update_box(BoxMeta(1, 'TEST', None, 'other', 1, 1))
        worker.update_box(BoxMeta(1, 'TEST', None, 'device', 1, 1))
    else:
        with Session(database) as db:
            db.execute(update(BoxDetail).values(hookA_threshold=94721))
            db.commit()
        worker._current_thresholds(reading())
        with Session(database) as db:
            db.execute(update(BoxDetail).values(hookA_threshold=20000))
            db.commit()
    assert worker._current_thresholds(reading(threshold_edit_revision=8,
                                              threshold_a=30000)) == (20000, 21000)


def test_newer_device_revision_wraps_uint32(database):
    worker = poller()
    worker._current_thresholds(reading(threshold_edit_revision=2**32 - 1))
    assert worker._current_thresholds(reading(threshold_edit_revision=0,
                                              threshold_a=30000)) == (30000, 21000)


@pytest.mark.asyncio
async def test_address_change_during_database_work_does_not_post_old_reading(database, monkeypatch):
    def unexpected(request):
        pytest.fail('Old telemetry cannot configure a replacement address')
    async with httpx.AsyncClient(transport=httpx.MockTransport(unexpected)) as client:
        worker = poller(client)
        original = worker._current_thresholds
        def change_address(current):
            result = original(current)
            worker.update_box(BoxMeta(1, 'TEST', None, 'replacement', 1, 1))
            return result
        monkeypatch.setattr(worker, '_current_thresholds', change_address)
        await worker._reconcile_thresholds(reading())
