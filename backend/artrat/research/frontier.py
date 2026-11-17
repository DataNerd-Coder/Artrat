"""The Research Frontier: a durable, polite, idempotent task queue in Postgres (ADR 0003).

Claiming uses FOR UPDATE SKIP LOCKED so any number of agent processes can share it. Each claim
increments `attempts`, which doubles as a fencing token: a worker whose lease expired cannot
complete a task another worker has since claimed.
"""

import random
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, or_, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from artrat.platform.config import Settings
from artrat.research.links import canonical_url, site_of
from artrat.research.tables import ResearchTaskRow, SiteStateRow, TaskKind, TaskStatus


def utcnow() -> datetime:
    return datetime.now(UTC)


@dataclass(frozen=True)
class ClaimedTask:
    id: uuid.UUID
    kind: TaskKind
    url: str
    depth: int
    priority: float
    attempt: int
    payload: dict = field(default_factory=dict)


class LeaseLost(RuntimeError):
    """Another worker owns this task now; the caller must roll back its work."""


def enqueue(
    session: Session,
    kind: TaskKind,
    url: str,
    *,
    depth: int,
    priority: float,
    reason: dict,
    settings: Settings,
    key: str | None = None,
    payload: dict | None = None,
    now: datetime | None = None,
) -> bool:
    """Add a task unless the same (kind, key) was ever queued or the site's page budget
    is spent. Returns True when a new task was created."""
    now = now or utcnow()
    canon_url = canonical_url(url)
    task_key = key or canon_url
    site = site_of(canon_url)
    session.execute(
        insert(SiteStateRow)
        .values(site=site, next_allowed_at=now, pages_enqueued=0)
        .on_conflict_do_nothing(index_elements=["site"])
    )
    state = session.scalar(select(SiteStateRow).where(SiteStateRow.site == site).with_for_update())
    if state.pages_enqueued >= settings.max_pages_per_site:
        return False
    task_payload = {"url": canon_url, "depth": depth, **(payload or {})}
    inserted = session.scalar(
        insert(ResearchTaskRow)
        .values(
            id=uuid.uuid4(),
            kind=kind,
            key=task_key,
            site=site,
            payload=task_payload,
            priority=priority,
            reason=reason,
            status=TaskStatus.QUEUED,
            attempts=0,
            max_attempts=settings.max_attempts,
            run_after=now,
            created_at=now,
            updated_at=now,
        )
        .on_conflict_do_nothing(constraint="uq_research_task_kind_key")
        .returning(ResearchTaskRow.id)
    )
    if inserted is None:
        return False
    state.pages_enqueued += 1
    return True


def claim(session: Session, settings: Settings, now: datetime | None = None) -> ClaimedTask | None:
    """Take the highest-priority runnable task whose site is not in its politeness delay."""
    now = now or utcnow()
    runnable = or_(
        (ResearchTaskRow.status == TaskStatus.QUEUED) & (ResearchTaskRow.run_after <= now),
        (ResearchTaskRow.status == TaskStatus.RUNNING) & (ResearchTaskRow.locked_until < now),
    )
    candidate_ids = session.scalars(
        select(ResearchTaskRow.id)
        .join(SiteStateRow, SiteStateRow.site == ResearchTaskRow.site)
        .where(runnable, SiteStateRow.next_allowed_at <= now)
        .order_by(ResearchTaskRow.priority.desc(), ResearchTaskRow.created_at)
        .limit(25)
    ).all()
    for task_id in candidate_ids:
        # Lock one row at a time, so other claimers can take the rest of the candidates.
        task = session.scalar(
            select(ResearchTaskRow)
            .where(ResearchTaskRow.id == task_id, runnable)
            .with_for_update(skip_locked=True)
        )
        if task is None:
            continue  # another worker has it
        if task.status is TaskStatus.RUNNING and task.attempts >= task.max_attempts:
            _finish(task, TaskStatus.DEAD, now, error=task.last_error or "lease expired")
            continue
        site = session.scalar(
            select(SiteStateRow)
            .where(SiteStateRow.site == task.site, SiteStateRow.next_allowed_at <= now)
            .with_for_update(skip_locked=True)
        )
        if site is None:
            continue  # another worker just took this site's turn
        delay = settings.site_delay_seconds * (1 + random.uniform(0, settings.site_delay_jitter))
        site.next_allowed_at = now + timedelta(seconds=delay)
        task.status = TaskStatus.RUNNING
        task.attempts += 1
        task.locked_until = now + timedelta(seconds=settings.lease_seconds)
        task.updated_at = now
        session.flush()
        return ClaimedTask(
            id=task.id,
            kind=task.kind,
            url=task.payload["url"],
            depth=task.payload["depth"],
            priority=task.priority,
            attempt=task.attempts,
            payload=dict(task.payload),
        )
    session.flush()
    return None


def _finish(row: ResearchTaskRow, status: TaskStatus, now: datetime, *, error=None, result=None):
    row.status = status
    row.locked_until = None
    row.updated_at = now
    row.finished_at = now
    row.last_error = error
    row.result = result


def _owned(session: Session, task: ClaimedTask) -> ResearchTaskRow:
    row = session.scalar(
        select(ResearchTaskRow)
        .where(
            ResearchTaskRow.id == task.id,
            ResearchTaskRow.status == TaskStatus.RUNNING,
            ResearchTaskRow.attempts == task.attempt,
        )
        .with_for_update()
    )
    if row is None:
        raise LeaseLost(f"task {task.id} attempt {task.attempt} no longer owned")
    return row


def complete(session: Session, task: ClaimedTask, result: dict, now: datetime | None = None):
    _finish(_owned(session, task), TaskStatus.DONE, now or utcnow(), result=result)


def skip(session: Session, task: ClaimedTask, reason: str, now: datetime | None = None):
    _finish(_owned(session, task), TaskStatus.SKIPPED, now or utcnow(), result={"reason": reason})


def fail(
    session: Session,
    task: ClaimedTask,
    error: str,
    *,
    retryable: bool,
    settings: Settings,
    now: datetime | None = None,
):
    """Retry with exponential backoff, or mark dead when permanent or out of attempts."""
    now = now or utcnow()
    row = _owned(session, task)
    if retryable and row.attempts < row.max_attempts:
        row.status = TaskStatus.QUEUED
        row.locked_until = None
        row.last_error = error
        row.updated_at = now
        row.run_after = now + timedelta(seconds=settings.retry_base_seconds * 2 ** (row.attempts - 1))
    else:
        _finish(row, TaskStatus.DEAD, now, error=error)


def pending_count(session: Session) -> int:
    return session.scalar(
        select(func.count())
        .select_from(ResearchTaskRow)
        .where(ResearchTaskRow.status.in_([TaskStatus.QUEUED, TaskStatus.RUNNING]))
    )


def status_counts(session: Session) -> dict[str, int]:
    rows = session.execute(
        select(ResearchTaskRow.status, func.count()).group_by(ResearchTaskRow.status)
    ).all()
    return {status.value: n for status, n in rows}
