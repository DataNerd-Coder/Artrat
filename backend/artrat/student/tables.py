"""Student context persistence (docs/04 §3, docs/06). Private to artrat.student."""

import uuid
from datetime import date, datetime
from enum import StrEnum

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from artrat.catalogue.api import DocumentType, SignerRole
from artrat.platform.db import Base, JsonDoc


class FactOrigin(StrEnum):
    SELF_REPORTED = "self_reported"
    DOCUMENT_EXTRACTED = "document_extracted"
    VERIFIED = "verified"


class ApplicationStatus(StrEnum):
    PORTAL_INSPECTION_PENDING = "portal_inspection_pending"
    PORTAL_MAPPED = "portal_mapped"
    PREPARING = "preparing"
    WAITING_FOR_REQUIREMENTS = "waiting_for_requirements"
    READY_FOR_REVIEW = "ready_for_review"
    APPROVED_FOR_EXECUTION = "approved_for_execution"
    EXECUTING = "executing"
    VERIFYING_SUBMISSION = "verifying_submission"
    SUBMITTED = "submitted"
    SUBMISSION_KIT_EXPORTED = "submission_kit_exported"


class StudentTaskStatus(StrEnum):
    OPEN = "open"
    SATISFIED = "satisfied"


def _enum(cls: type[StrEnum], name: str) -> Enum:
    return Enum(cls, name=name, values_callable=lambda e: [m.value for m in e])


class StudentRow(Base):
    __tablename__ = "student"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(Text)
    date_of_birth: Mapped[date] = mapped_column(Date)
    is_minor: Mapped[bool] = mapped_column(Boolean, default=False)
    institution: Mapped[str] = mapped_column(Text)
    department: Mapped[str] = mapped_column(Text)
    matric_number: Mapped[str] = mapped_column(String(120))
    academic_level: Mapped[str] = mapped_column(String(40))
    autonomous_level_promotion: Mapped[bool] = mapped_column(Boolean, default=True)
    state_of_origin: Mapped[str] = mapped_column(String(80))
    lga: Mapped[str] = mapped_column(String(120))
    residential_address: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ProfileFactRow(Base):
    __tablename__ = "profile_fact"
    __table_args__ = (UniqueConstraint("student_id", "key", name="uq_profile_fact_student_key"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("student.id", ondelete="CASCADE"), index=True
    )
    key: Mapped[str] = mapped_column(String(80))
    label: Mapped[str] = mapped_column(Text)
    value: Mapped[str] = mapped_column(Text)
    origin: Mapped[FactOrigin] = mapped_column(_enum(FactOrigin, "fact_origin"))
    source_detail: Mapped[str] = mapped_column(Text)
    document_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("vault_document.id", ondelete="SET NULL"), nullable=True
    )
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class VaultDocumentRow(Base):
    """Dynamic Vault document. School Admission Letter and JAMB Admission Letter are distinct."""

    __tablename__ = "vault_document"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("student.id", ondelete="CASCADE"), index=True
    )
    doc_type: Mapped[DocumentType] = mapped_column(_enum(DocumentType, "vault_document_type"))
    signed_by: Mapped[SignerRole | None] = mapped_column(
        _enum(SignerRole, "signer_role"), nullable=True
    )
    title: Mapped[str] = mapped_column(Text)
    file_name: Mapped[str] = mapped_column(Text)
    storage_key: Mapped[str] = mapped_column(Text)
    extracted_summary: Mapped[str] = mapped_column(Text)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ApplicationRow(Base):
    __tablename__ = "application"
    __table_args__ = (
        UniqueConstraint("student_id", "opportunity_id", name="uq_application_student_opp"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("student.id", ondelete="CASCADE"), index=True
    )
    opportunity_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("opportunity.id", ondelete="CASCADE"), index=True
    )
    opportunity_slug: Mapped[str] = mapped_column(String(200))
    status: Mapped[ApplicationStatus] = mapped_column(
        _enum(ApplicationStatus, "application_status")
    )
    ordered_items: Mapped[list] = mapped_column(JsonDoc)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class StudentTaskRow(Base):
    """Persistent reminder task synced to Google Tasks & Calendar (docs/04 §3.5, docs/06 §3.5)."""

    __tablename__ = "student_task"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("student.id", ondelete="CASCADE"), index=True
    )
    application_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("application.id", ondelete="CASCADE"), index=True
    )
    checklist_item_key: Mapped[str] = mapped_column(String(255), unique=True)
    title: Mapped[str] = mapped_column(Text)
    doc_type: Mapped[DocumentType] = mapped_column(_enum(DocumentType, "vault_document_type"))
    signed_by: Mapped[SignerRole | None] = mapped_column(
        _enum(SignerRole, "signer_role"), nullable=True
    )
    status: Mapped[StudentTaskStatus] = mapped_column(
        _enum(StudentTaskStatus, "student_task_status")
    )
    manual_completion_allowed: Mapped[bool] = mapped_column(Boolean, default=False)
    google_task_id: Mapped[str | None] = mapped_column(String(160), nullable=True)
    google_calendar_event_id: Mapped[str | None] = mapped_column(String(160), nullable=True)
    sync_status: Mapped[str] = mapped_column(String(40), default="synced")
    interval_hours: Mapped[int] = mapped_column(Integer, default=12)
    last_triggered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    next_trigger_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
