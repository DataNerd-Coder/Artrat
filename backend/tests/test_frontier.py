from datetime import UTC, datetime, timedelta

import pytest

from artrat.platform.config import Settings
from artrat.platform.db import session_scope
from artrat.research import frontier
from artrat.research.tables import ResearchTaskRow, TaskKind, TaskStatus

T0 = datetime(2026, 11, 17, 12, 0, tzinfo=UTC)
S = Settings(
    database_url="unused", site_delay_seconds=10, site_delay_jitter=0, lease_seconds=60,
    max_attempts=3, retry_base_seconds=30, max_pages_per_site=3,
)


def add(url: str, priority: float = 1.0, kind: TaskKind = TaskKind.FETCH) -> bool:
    with session_scope() as s:
        return frontier.enqueue(s, kind, url, depth=0, priority=priority, reason={}, settings=S, now=T0)


def claim(now: datetime) -> frontier.ClaimedTask | None:
    with session_scope() as s:
        return frontier.claim(s, S, now)


def row(task: frontier.ClaimedTask) -> ResearchTaskRow:
    with session_scope() as s:
        return s.get(ResearchTaskRow, task.id)


def test_same_page_is_queued_once_whatever_the_spelling(session):
    assert add("https://ptdf.gov.ng/os?utm_source=x")
    assert not add("HTTPS://PTDF.gov.ng/os#top")
    assert add("https://ptdf.gov.ng/os", kind=TaskKind.RENDER), "a render task is a different job"


def test_site_page_budget_caps_enqueueing(session):
    assert [add(f"https://a.org/{i}") for i in range(5)] == [True, True, True, False, False]


def test_claims_by_priority_and_respects_site_delay(session):
    add("https://a.org/low", 0.2)
    add("https://a.org/high", 0.9)
    add("https://b.org/mid", 0.5)
    first = claim(T0)
    second = claim(T0)
    assert first.url == "https://a.org/high"
    assert second.url == "https://b.org/mid", "a.org is in its politeness delay"
    assert claim(T0 + timedelta(seconds=5)) is None
    assert claim(T0 + timedelta(seconds=10)).url == "https://a.org/low"


def test_concurrent_claimers_never_get_the_same_task(session):
    add("https://a.org/1")
    add("https://b.org/1")
    with session_scope() as s1, session_scope() as s2:
        t1 = frontier.claim(s1, S, T0)
        t2 = frontier.claim(s2, S, T0)  # s1 has not committed: its rows are locked and skipped
        assert {t1.url, t2.url} == {"https://a.org/1", "https://b.org/1"}


def test_expired_lease_is_reclaimed_and_the_old_worker_is_fenced_out(session):
    add("https://a.org/1")
    stale = claim(T0)
    fresh = claim(T0 + timedelta(seconds=61))
    assert fresh.id == stale.id and fresh.attempt == 2
    with pytest.raises(frontier.LeaseLost), session_scope() as s:
        frontier.complete(s, stale, {})
    with session_scope() as s:
        frontier.complete(s, fresh, {"ok": True})
    assert row(fresh).status is TaskStatus.DONE


def test_retryable_failures_back_off_then_die(session):
    add("https://a.org/1")
    now = T0
    for attempt, wait in [(1, 30), (2, 60)]:
        task = claim(now)
        assert task.attempt == attempt
        with session_scope() as s:
            frontier.fail(s, task, "503", retryable=True, settings=S, now=now)
        r = row(task)
        assert r.status is TaskStatus.QUEUED and r.run_after == now + timedelta(seconds=wait)
        assert claim(now + timedelta(seconds=wait - 1)) is None
        now = now + timedelta(seconds=wait)
    task = claim(now)
    with session_scope() as s:
        frontier.fail(s, task, "503", retryable=True, settings=S, now=now)
    assert row(task).status is TaskStatus.DEAD


def test_permanent_failure_dies_immediately(session):
    add("https://a.org/gone")
    task = claim(T0)
    with session_scope() as s:
        frontier.fail(s, task, "404", retryable=False, settings=S, now=T0)
    assert row(task).status is TaskStatus.DEAD
