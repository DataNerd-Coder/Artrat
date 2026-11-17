"""Catalogue persistence. Private to the catalogue package; use artrat.catalogue.api from outside."""

import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from artrat.platform.db import Base, JsonDoc


class FetchMode(StrEnum):
    STATIC = "static"
    RENDERED = "rendered"


class OpportunityStatus(StrEnum):
    CANDIDATE = "candidate"
    VERIFIED = "verified"
    UPCOMING = "upcoming"
    OPEN = "open"
    CLOSED = "closed"
    STALE = "stale"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class SourceRow(Base):
    """One retrieved snapshot of a URL. Identical content for the same URL is stored once."""

    __tablename__ = "source"
    __table_args__ = (UniqueConstraint("url", "content_hash", name="uq_source_url_hash"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    url: Mapped[str] = mapped_column(Text, index=True)
    final_url: Mapped[str] = mapped_column(Text)
    status_code: Mapped[int] = mapped_column(Integer)
    fetch_mode: Mapped[FetchMode] = mapped_column(
        Enum(FetchMode, name="fetch_mode", values_callable=lambda e: [m.value for m in e])
    )
    content_hash: Mapped[str] = mapped_column(String(64))
    title: Mapped[str | None] = mapped_column(Text)
    snapshot_text: Mapped[str] = mapped_column(Text)
    retrieved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class OpportunityRow(Base):
    __tablename__ = "opportunity"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(200), unique=True)
    cycle: Mapped[str] = mapped_column(String(20))
    status: Mapped[OpportunityStatus] = mapped_column(
        Enum(
            OpportunityStatus,
            name="opportunity_status",
            values_callable=lambda e: [m.value for m in e],
        )
    )
    claims: Mapped[dict] = mapped_column(JsonDoc)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class PortalBlueprintRow(Base):
    """Dry-run Portal Blueprint mapped before preparing student documents (docs/04 §2.3)."""

    __tablename__ = "portal_blueprint"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    opportunity_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("opportunity.id", ondelete="CASCADE"), unique=True, index=True
    )
    portal_url: Mapped[str] = mapped_column(Text)
    version: Mapped[int] = mapped_column(Integer, default=1)
    fields: Mapped[list] = mapped_column(JsonDoc)
    uploads: Mapped[list] = mapped_column(JsonDoc)
    essay_prompts: Mapped[list] = mapped_column(JsonDoc)
    declarations: Mapped[list] = mapped_column(JsonDoc)
    auth_steps: Mapped[list] = mapped_column(JsonDoc)
    automation_policy: Mapped[dict] = mapped_column(JsonDoc)
    inspected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class UniversitySemesterRow(Base):
    """Global per-university active session & semester cache (docs/04 §2.5)."""

    __tablename__ = "university_semester"

    short_code: Mapped[str] = mapped_column(String(32), primary_key=True)
    university_name: Mapped[str] = mapped_column(Text)
    current_session: Mapped[dict] = mapped_column(JsonDoc)
    current_semester: Mapped[dict] = mapped_column(JsonDoc)
    next_level_promotion_window: Mapped[str] = mapped_column(Text)
    last_checked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
