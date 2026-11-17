"""Public interface of the Catalogue context. Other modules import only from here."""

import hashlib
import uuid
from collections.abc import Iterable
from datetime import UTC, datetime

from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session

from artrat.catalogue.blueprints import (
    AuthStep,
    AutomationPolicy,
    PortalBlueprintDraft,
    PortalBlueprintOut,
    PortalEssaySpec,
    PortalFieldSpec,
    PortalUploadSpec,
    SemesterState,
    UniversitySemesterIn,
    UniversitySemesterOut,
)
from artrat.catalogue.claims import Claim, EvidenceRef, Verification, passage_in_snapshot
from artrat.catalogue.requirements import (
    CriterionKey,
    CriterionRequirement,
    DocumentRequirement,
    DocumentType,
    EssayRequirement,
    RefereeRequirement,
    Requirement,
    SignerRole,
)
from artrat.catalogue.tables import (
    FetchMode,
    OpportunityRow,
    OpportunityStatus,
    PortalBlueprintRow,
    SourceRow,
    UniversitySemesterRow,
)

__all__ = [
    "AuthStep",
    "AutomationPolicy",
    "Claim",
    "CriterionKey",
    "CriterionRequirement",
    "DocumentRequirement",
    "DocumentType",
    "EssayRequirement",
    "EvidenceMismatch",
    "EvidenceRef",
    "FetchMode",
    "NotFound",
    "OpportunityDraft",
    "OpportunityOut",
    "OpportunityStatus",
    "PortalBlueprintDraft",
    "PortalBlueprintOut",
    "PortalEssaySpec",
    "PortalFieldSpec",
    "PortalUploadSpec",
    "RefereeRequirement",
    "Requirement",
    "SemesterState",
    "SignerRole",
    "SnapshotIn",
    "SourceOut",
    "SourceSnapshotOut",
    "UniversitySemesterIn",
    "UniversitySemesterOut",
    "Verification",
    "content_hash",
    "get_opportunity",
    "get_portal_blueprint",
    "get_source",
    "get_university_semester",
    "list_opportunities",
    "list_sources",
    "list_university_semesters",
    "passage_in_snapshot",
    "record_opportunity",
    "record_portal_blueprint",
    "record_university_semester",
    "store_snapshot",
]

TRUSTED_VERIFICATIONS = {Verification.OFFICIAL.value, Verification.CORROBORATED.value}


class EvidenceMismatch(ValueError):
    """An evidence passage is not present in the snapshot it cites."""


class NotFound(LookupError):
    """The requested Catalogue entity does not exist."""


def content_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


class SnapshotIn(BaseModel):
    url: str
    final_url: str
    status_code: int
    fetch_mode: FetchMode
    title: str | None
    text: str
    retrieved_at: datetime


class SourceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    url: str
    final_url: str
    status_code: int
    fetch_mode: FetchMode
    content_hash: str
    title: str | None
    retrieved_at: datetime


class SourceSnapshotOut(SourceOut):
    snapshot_text: str


class OpportunityDraft(BaseModel):
    slug: str
    cycle: str
    title: Claim[str]
    official_url: Claim[str]
    application_url: Claim[str]
    deadline: Claim[datetime]
    requirements: tuple[Requirement, ...] = ()


class OpportunityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slug: str
    cycle: str
    status: OpportunityStatus
    claims: dict
    updated_at: datetime


def store_snapshot(session: Session, snap: SnapshotIn) -> SourceOut:
    """Idempotent: the same URL with the same content returns the existing Source."""
    digest = content_hash(snap.text)
    existing = session.scalar(
        select(SourceRow).where(SourceRow.url == snap.url, SourceRow.content_hash == digest)
    )
    if existing:
        return SourceOut.model_validate(existing)
    row = SourceRow(
        url=snap.url,
        final_url=snap.final_url,
        status_code=snap.status_code,
        fetch_mode=snap.fetch_mode,
        content_hash=digest,
        title=snap.title,
        snapshot_text=snap.text,
        retrieved_at=snap.retrieved_at,
    )
    session.add(row)
    session.flush()
    return SourceOut.model_validate(row)


def get_source(session: Session, source_id: uuid.UUID) -> SourceSnapshotOut:
    row = session.get(SourceRow, source_id)
    if row is None:
        raise NotFound(f"unknown source {source_id}")
    return SourceSnapshotOut.model_validate(row)


def list_sources(session: Session, limit: int = 50) -> list[SourceOut]:
    rows = session.scalars(select(SourceRow).order_by(SourceRow.retrieved_at.desc()).limit(limit))
    return [SourceOut.model_validate(r) for r in rows]


def _check_claims(session: Session, claims: Iterable[Claim]) -> None:
    for claim in claims:
        for ev in claim.evidence:
            try:
                sid = uuid.UUID(ev.source_id)
            except ValueError as exc:
                raise EvidenceMismatch(f"invalid source_id {ev.source_id!r}") from exc
            source = session.get(SourceRow, sid)
            if source is None:
                raise EvidenceMismatch(f"evidence cites unknown source {ev.source_id}")
            if not passage_in_snapshot(ev.passage, source.snapshot_text):
                raise EvidenceMismatch(
                    f"passage {ev.passage[:60]!r} is not in snapshot {ev.source_id}"
                )


def _has_trusted_core_claims(claims: dict) -> bool:
    for key in ("title", "application_url", "deadline"):
        c = claims.get(key) or {}
        if c.get("verification") not in TRUSTED_VERIFICATIONS or c.get("value") is None:
            return False
    return True


def _refresh_verification_status(session: Session, row: OpportunityRow) -> None:
    """Promote Candidate -> Verified once core claims and a PortalBlueprint exist (docs/04 §2.6)."""
    if row.status is not OpportunityStatus.CANDIDATE:
        return
    has_blueprint = (
        session.scalar(
            select(PortalBlueprintRow.id).where(PortalBlueprintRow.opportunity_id == row.id)
        )
        is not None
    )
    if has_blueprint and _has_trusted_core_claims(row.claims):
        row.status = OpportunityStatus.VERIFIED


def record_opportunity(session: Session, draft: OpportunityDraft) -> OpportunityOut:
    """Create or update an Opportunity. Every evidence passage must match its snapshot."""
    _check_claims(
        session,
        [
            draft.title,
            draft.official_url,
            draft.application_url,
            draft.deadline,
            *(req.claim for req in draft.requirements),
        ],
    )
    now = datetime.now(UTC)
    claims = draft.model_dump(
        mode="json",
        include={"title", "official_url", "application_url", "deadline", "requirements"},
    )
    row = session.scalar(select(OpportunityRow).where(OpportunityRow.slug == draft.slug))
    if row is None:
        row = OpportunityRow(
            slug=draft.slug,
            cycle=draft.cycle,
            status=OpportunityStatus.CANDIDATE,
            claims=claims,
            created_at=now,
            updated_at=now,
        )
        session.add(row)
        session.flush()
    else:
        row.cycle = draft.cycle
        row.claims = claims
        row.updated_at = now
    _refresh_verification_status(session, row)
    session.flush()
    return OpportunityOut.model_validate(row)


def get_opportunity(session: Session, slug: str) -> OpportunityOut:
    row = session.scalar(select(OpportunityRow).where(OpportunityRow.slug == slug))
    if row is None:
        raise NotFound(f"unknown opportunity {slug!r}")
    return OpportunityOut.model_validate(row)


def list_opportunities(session: Session, limit: int = 50) -> list[OpportunityOut]:
    rows = session.scalars(
        select(OpportunityRow).order_by(OpportunityRow.updated_at.desc()).limit(limit)
    )
    return [OpportunityOut.model_validate(r) for r in rows]


def record_portal_blueprint(session: Session, draft: PortalBlueprintDraft) -> PortalBlueprintOut:
    """Record or update the dry-run PortalBlueprint for an Opportunity (docs/04 §2.3)."""
    _check_claims(session, [draft.automation_policy])
    opp = session.scalar(
        select(OpportunityRow).where(OpportunityRow.slug == draft.opportunity_slug)
    )
    if opp is None:
        raise NotFound(f"unknown opportunity {draft.opportunity_slug!r}")
    now = datetime.now(UTC)
    payload = draft.model_dump(
        mode="json",
        include={
            "fields",
            "uploads",
            "essay_prompts",
            "declarations",
            "auth_steps",
            "automation_policy",
        },
    )
    row = session.scalar(
        select(PortalBlueprintRow).where(PortalBlueprintRow.opportunity_id == opp.id)
    )
    if row is None:
        row = PortalBlueprintRow(
            opportunity_id=opp.id,
            portal_url=draft.portal_url,
            version=1,
            inspected_at=now,
            **payload,
        )
        session.add(row)
    else:
        current = {k: getattr(row, k) for k in payload}
        if current != payload or row.portal_url != draft.portal_url:
            row.version += 1
            row.portal_url = draft.portal_url
            for k, v in payload.items():
                setattr(row, k, v)
        row.inspected_at = now
    session.flush()
    _refresh_verification_status(session, opp)
    session.flush()
    return PortalBlueprintOut.model_validate(row)


def get_portal_blueprint(session: Session, opportunity_slug: str) -> PortalBlueprintOut:
    opp = session.scalar(select(OpportunityRow).where(OpportunityRow.slug == opportunity_slug))
    if opp is None:
        raise NotFound(f"unknown opportunity {opportunity_slug!r}")
    row = session.scalar(
        select(PortalBlueprintRow).where(PortalBlueprintRow.opportunity_id == opp.id)
    )
    if row is None:
        raise NotFound(f"no portal blueprint for {opportunity_slug!r}")
    return PortalBlueprintOut.model_validate(row)


def record_university_semester(
    session: Session, record: UniversitySemesterIn
) -> UniversitySemesterOut:
    """Upsert a verified UniversitySemesterRecord into the global cache (docs/04 §2.5)."""
    _check_claims(session, [record.current_session, record.current_semester])
    code = record.short_code.strip().upper()
    now = datetime.now(UTC)
    dumped = record.model_dump(mode="json", include={"current_session", "current_semester"})
    row = session.get(UniversitySemesterRow, code)
    if row is None:
        row = UniversitySemesterRow(
            short_code=code,
            university_name=record.university_name,
            current_session=dumped["current_session"],
            current_semester=dumped["current_semester"],
            next_level_promotion_window=record.next_level_promotion_window,
            last_checked_at=now,
        )
        session.add(row)
    else:
        row.university_name = record.university_name
        row.current_session = dumped["current_session"]
        row.current_semester = dumped["current_semester"]
        row.next_level_promotion_window = record.next_level_promotion_window
        row.last_checked_at = now
    session.flush()
    return UniversitySemesterOut.model_validate(row)


def get_university_semester(session: Session, short_code: str) -> UniversitySemesterOut:
    row = session.get(UniversitySemesterRow, short_code.strip().upper())
    if row is None:
        raise NotFound(f"unknown university {short_code!r}")
    return UniversitySemesterOut.model_validate(row)


def list_university_semesters(session: Session) -> list[UniversitySemesterOut]:
    rows = session.scalars(
        select(UniversitySemesterRow).order_by(UniversitySemesterRow.short_code)
    )
    return [UniversitySemesterOut.model_validate(r) for r in rows]
