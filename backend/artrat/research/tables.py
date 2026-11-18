"""Research Frontier & Directions persistence (docs/05 §1-3). Private to the research package."""

import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import (
    DateTime,
    Enum,
    Float,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from artrat.platform.db import Base, JsonDoc


class TaskKind(StrEnum):
    SEARCH = "search"
    FETCH = "fetch"
    RENDER = "render"
    EXTRACT = "extract"
    INSPECT_PORTAL = "inspect_portal"
    CHECK_UNIVERSITY_SEMESTER = "check_university_semester"


class TaskStatus(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    DONE = "done"
    SKIPPED = "skipped"  # deliberately not run, e.g. robots.txt disallows it
    DEAD = "dead"  # failed permanently or ran out of attempts


def _enum(cls: type[StrEnum], name: str) -> Enum:
    return Enum(cls, name=name, values_callable=lambda e: [m.value for m in e])


class ResearchTaskRow(Base):
    __tablename__ = "research_task"
    __table_args__ = (UniqueConstraint("kind", "key", name="uq_research_task_kind_key"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    kind: Mapped[TaskKind] = mapped_column(_enum(TaskKind, "research_task_kind"))
    key: Mapped[str] = mapped_column(Text)  # idempotency key, e.g. the canonical URL
    site: Mapped[str] = mapped_column(String(255), index=True)
    payload: Mapped[dict] = mapped_column(JsonDoc)
    priority: Mapped[float] = mapped_column(Float)
    reason: Mapped[dict] = mapped_column(JsonDoc)  # why it was enqueued, for offline evaluation
    status: Mapped[TaskStatus] = mapped_column(_enum(TaskStatus, "research_task_status"))
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    max_attempts: Mapped[int] = mapped_column(Integer)
    run_after: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_error: Mapped[str | None] = mapped_column(Text)
    result: Mapped[dict | None] = mapped_column(JsonDoc)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class SiteStateRow(Base):
    """Per-site politeness clock and page budget."""

    __tablename__ = "site_state"

    site: Mapped[str] = mapped_column(String(255), primary_key=True)
    next_allowed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    pages_enqueued: Mapped[int] = mapped_column(Integer, default=0)


class ResearchDirectionRow(Base):
    """A discovery topic/channel whose yield is adapted via Thompson sampling (docs/05 §3)."""

    __tablename__ = "research_direction"

    slug: Mapped[str] = mapped_column(String(120), primary_key=True)
    channel: Mapped[str] = mapped_column(String(40))
    query: Mapped[str] = mapped_column(Text)
    demand_weight: Mapped[float] = mapped_column(Float, default=1.0)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    leads_found: Mapped[int] = mapped_column(Integer, default=0)
    verified_opportunities: Mapped[int] = mapped_column(Integer, default=0)
    expired_opportunities: Mapped[int] = mapped_column(Integer, default=0)
    total_cost: Mapped[float] = mapped_column(Float, default=0.0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class LearnedSignalRow(Base):
    """Self-learning empirical Bayesian weights for anchor phrases, funding cues, and domains."""

    __tablename__ = "learned_signal"
    __table_args__ = (
        UniqueConstraint("category", "phrase", name="uq_learned_signal_category_phrase"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    category: Mapped[str] = mapped_column(String(40), index=True)
    phrase: Mapped[str] = mapped_column(String(200), index=True)
    alpha: Mapped[float] = mapped_column(Float, default=1.5)
    beta: Mapped[float] = mapped_column(Float, default=1.0)
    observations: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
