"""Persistence for Evidence Ledger, Packages, Approvals, and Submissions (docs/04 §3.6, docs/06)."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from artrat.platform.db import Base, JsonDoc


class EvidenceLedgerRow(Base):
    """Verified student achievements, projects, community roots, and family/disability context."""

    __tablename__ = "evidence_ledger"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("student.id", ondelete="CASCADE"), index=True
    )
    category: Mapped[str] = mapped_column(String(60))
    title: Mapped[str] = mapped_column(Text)
    fact_text: Mapped[str] = mapped_column(Text)
    source_detail: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class PackageRow(Base):
    """Frozen, versioned snapshot of an Application's ordered items and packageHash."""

    __tablename__ = "application_package"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("application.id", ondelete="CASCADE"), unique=True, index=True
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("student.id", ondelete="CASCADE"), index=True
    )
    version: Mapped[int] = mapped_column(Integer, default=1)
    package_hash: Mapped[str] = mapped_column(String(64))
    ordered_items: Mapped[list] = mapped_column(JsonDoc)
    endorsement_letter: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ApprovalRow(Base):
    """Immutable version-bound Declare & Submit record. Voided if the Package changes."""

    __tablename__ = "application_approval"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("application.id", ondelete="CASCADE"), index=True
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("student.id", ondelete="CASCADE"), index=True
    )
    package_version: Mapped[int] = mapped_column(Integer)
    package_hash: Mapped[str] = mapped_column(String(64))
    declaration_text: Mapped[str] = mapped_column(Text)
    voided: Mapped[bool] = mapped_column(Boolean, default=False)
    approved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class SubmissionRow(Base):
    """Autonomous cloud execution record with idempotency key, OTP pickup, and archived receipt."""

    __tablename__ = "application_submission"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("application.id", ondelete="CASCADE"), unique=True, index=True
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("student.id", ondelete="CASCADE"), index=True
    )
    package_version: Mapped[int] = mapped_column(Integer)
    package_hash: Mapped[str] = mapped_column(String(64))
    idempotency_key: Mapped[str] = mapped_column(String(160), unique=True)
    status: Mapped[str] = mapped_column(String(40))
    portal_reference: Mapped[str] = mapped_column(String(120))
    otp_used: Mapped[str | None] = mapped_column(String(32), nullable=True)
    receipt_vault_doc_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("vault_document.id", ondelete="SET NULL"), nullable=True
    )
    attempts: Mapped[int] = mapped_column(Integer, default=1)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
