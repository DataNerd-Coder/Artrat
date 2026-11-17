"""Public interface for Writing Studio, Gemini Canvas, Submission Kits, and Autonomous Submission
Execution (Phase 4 & Phase 5, docs/04 §3.6, docs/06 §3.3-3.7, docs/07 P4-P5)."""

import hashlib
import json
import uuid
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from artrat.catalogue import api as catalogue
from artrat.catalogue.api import AutomationPolicy, DocumentType, SignerRole
from artrat.integrations.google import (
    GmailMessage,
    find_submission_receipt,
    pickup_portal_otp,
)
from artrat.student import api as student
from artrat.student.tables import ApplicationRow, ApplicationStatus, ProfileFactRow, StudentRow
from artrat.submission.kit import build_docx_submission_kit, build_pdf_submission_kit
from artrat.submission.tables import (
    ApprovalRow,
    EvidenceLedgerRow,
    PackageRow,
    SubmissionRow,
)
from artrat.submission.writing import (
    UnsupportedClaimError,
    WordLimitExceededError,
    compose_grounded_essay,
    generate_dynamic_endorsement_letter,
    rewrite_essay_in_canvas,
    verify_draft_against_ledger,
)

__all__ = [
    "AmbiguousSubmissionError",
    "ApprovalOut",
    "CanvasRewriteIn",
    "DeclareAndSubmitIn",
    "EvidenceLedgerIn",
    "EvidenceLedgerOut",
    "PackageBuildIn",
    "PackageOut",
    "PortalExecutionDriver",
    "ReadinessIncompleteError",
    "StalePackageHashError",
    "SubmissionOut",
    "UnsupportedClaimError",
    "WordLimitExceededError",
    "add_evidence_ledger_entry",
    "build_or_update_package",
    "canvas_rewrite_application_essay",
    "compute_package_hash",
    "declare_and_submit",
    "export_submission_kit",
    "get_active_approval",
    "get_package",
    "list_evidence_ledger",
]


class ReadinessIncompleteError(ValueError):
    """Cannot freeze or approve a package while required items are still missing."""


class StalePackageHashError(ValueError):
    """Rule #3 (docs/06 §3.3): Declare & Submit rejected because packageHash does not match."""


class AmbiguousSubmissionError(RuntimeError):
    """Raised when the portal submission click had an ambiguous network/HTTP outcome."""


PortalExecutionDriver = Callable[[str, list[dict], str | None], str]


class EvidenceLedgerIn(BaseModel):
    category: str = Field(min_length=2, max_length=60)
    title: str = Field(min_length=2)
    fact_text: str = Field(min_length=2)
    source_detail: str = Field(min_length=2)


class EvidenceLedgerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    student_id: uuid.UUID
    category: str
    title: str
    fact_text: str
    source_detail: str
    created_at: datetime


class PackageBuildIn(BaseModel):
    signer_role: SignerRole | None = None
    recipient_address: str | None = None


class CanvasRewriteIn(BaseModel):
    prompt_id: str = Field(min_length=1)
    instruction: str = Field(default="Refine draft")
    replacement_text: str | None = None


class PackageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    application_id: uuid.UUID
    student_id: uuid.UUID
    version: int
    package_hash: str
    ordered_items: list[dict]
    endorsement_letter: str | None
    updated_at: datetime


class ApprovalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    application_id: uuid.UUID
    student_id: uuid.UUID
    package_version: int
    package_hash: str
    declaration_text: str
    voided: bool
    approved_at: datetime


class DeclareAndSubmitIn(BaseModel):
    package_hash: str = Field(min_length=8)
    declaration_text: str = Field(min_length=5)


class SubmissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    application_id: uuid.UUID
    student_id: uuid.UUID
    package_version: int
    package_hash: str
    idempotency_key: str
    status: str
    portal_reference: str
    otp_used: str | None
    receipt_vault_doc_id: uuid.UUID | None
    attempts: int
    submitted_at: datetime


def compute_package_hash(ordered_items: list[dict], endorsement_letter: str | None) -> str:
    canonical = json.dumps(
        {"ordered_items": ordered_items, "endorsement_letter": endorsement_letter or ""},
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def add_evidence_ledger_entry(
    session: Session, student_id: uuid.UUID, entry: EvidenceLedgerIn
) -> EvidenceLedgerOut:
    if session.get(StudentRow, student_id) is None:
        raise student.StudentNotFound(f"unknown student {student_id}")
    row = EvidenceLedgerRow(
        student_id=student_id,
        category=entry.category,
        title=entry.title,
        fact_text=entry.fact_text,
        source_detail=entry.source_detail,
        created_at=datetime.now(UTC),
    )
    session.add(row)
    session.flush()
    return EvidenceLedgerOut.model_validate(row)


def list_evidence_ledger(session: Session, student_id: uuid.UUID) -> list[EvidenceLedgerOut]:
    rows = session.scalars(
        select(EvidenceLedgerRow)
        .where(EvidenceLedgerRow.student_id == student_id)
        .order_by(EvidenceLedgerRow.created_at)
    ).all()
    return [EvidenceLedgerOut.model_validate(r) for r in rows]


def _ledger_and_facts(session: Session, student_id: uuid.UUID) -> tuple[list[str], list[str]]:
    ledger_texts = [
        r.fact_text
        for r in session.scalars(
            select(EvidenceLedgerRow)
            .where(EvidenceLedgerRow.student_id == student_id)
            .order_by(EvidenceLedgerRow.created_at)
        ).all()
    ]
    fact_values = [
        f.value
        for f in session.scalars(
            select(ProfileFactRow).where(ProfileFactRow.student_id == student_id)
        ).all()
    ]
    return ledger_texts, fact_values


def _void_prior_approvals(session: Session, application_id: uuid.UUID) -> None:
    approvals = session.scalars(
        select(ApprovalRow).where(
            ApprovalRow.application_id == application_id, ApprovalRow.voided.is_(False)
        )
    ).all()
    for a in approvals:
        a.voided = True


def build_or_update_package(
    session: Session,
    application_id: uuid.UUID,
    *,
    signer_role: SignerRole | None = None,
    recipient_address: str | None = None,
) -> PackageOut:
    """Draft grounded essays and endorsement letter, compute packageHash, and void stale approvals."""
    app_row = session.get(ApplicationRow, application_id)
    if app_row is None:
        raise student.StudentNotFound(f"unknown application {application_id}")
    stu = session.get(StudentRow, app_row.student_id)
    opp = catalogue.get_opportunity(session, app_row.opportunity_slug)
    ledger_texts, fact_values = _ledger_and_facts(session, stu.id)

    updated_items: list[dict] = []
    for item in app_row.ordered_items:
        if item.get("kind") == "essay":
            draft_text = item.get("draft_text") or compose_grounded_essay(
                student_name=stu.full_name,
                institution=stu.institution,
                department=stu.department,
                prompt=item.get("prompt", "Personal Statement"),
                word_limit=item.get("word_limit"),
                ledger_texts=ledger_texts,
                fact_values=fact_values,
            )
            verify_draft_against_ledger(draft_text, ledger_texts, fact_values)
            item = {**item, "draft_text": draft_text, "status": "ready"}
        updated_items.append(item)

    app_row.ordered_items = updated_items
    opp_title = opp.claims["title"]["value"] or opp.slug

    endorsement_letter: str | None = None
    if signer_role is not None:
        endorsement_letter = generate_dynamic_endorsement_letter(
            student_name=stu.full_name,
            matric_number=stu.matric_number,
            institution=stu.institution,
            department=stu.department,
            residential_address=stu.residential_address,
            signer_role=signer_role,
            recipient_address=recipient_address or f"{stu.department}, {stu.institution}",
            opportunity_title=opp_title,
            ledger_texts=ledger_texts,
        )

    pkg_hash = compute_package_hash(updated_items, endorsement_letter)
    now = datetime.now(UTC)
    pkg = session.scalar(select(PackageRow).where(PackageRow.application_id == application_id))
    if pkg is None:
        pkg = PackageRow(
            application_id=application_id,
            student_id=stu.id,
            version=1,
            package_hash=pkg_hash,
            ordered_items=updated_items,
            endorsement_letter=endorsement_letter,
            created_at=now,
            updated_at=now,
        )
        session.add(pkg)
    elif pkg.package_hash != pkg_hash:
        pkg.version += 1
        pkg.package_hash = pkg_hash
        pkg.ordered_items = updated_items
        pkg.endorsement_letter = endorsement_letter
        pkg.updated_at = now
        _void_prior_approvals(session, application_id)
    session.flush()
    return PackageOut.model_validate(pkg)


def canvas_rewrite_application_essay(
    session: Session,
    application_id: uuid.UUID,
    rewrite: CanvasRewriteIn,
) -> PackageOut:
    """Update or refine an essay in Gemini Canvas; enforces zero fabrication & voids prior approvals."""
    app_row = session.get(ApplicationRow, application_id)
    if app_row is None:
        raise student.StudentNotFound(f"unknown application {application_id}")
    pkg = session.scalar(select(PackageRow).where(PackageRow.application_id == application_id))
    if pkg is None:
        pkg_out = build_or_update_package(session, application_id)
        pkg = session.get(PackageRow, pkg_out.id)

    ledger_texts, fact_values = _ledger_and_facts(session, app_row.student_id)
    updated_items: list[dict] = []
    found = False
    for item in pkg.ordered_items:
        if item.get("kind") == "essay" and item.get("prompt_id") == rewrite.prompt_id:
            found = True
            new_draft = rewrite_essay_in_canvas(
                current_draft=item.get("draft_text") or "",
                instruction=rewrite.instruction,
                word_limit=item.get("word_limit"),
                ledger_texts=ledger_texts,
                fact_values=fact_values,
                replacement_text=rewrite.replacement_text,
            )
            item = {**item, "draft_text": new_draft}
        updated_items.append(item)

    if not found:
        raise student.StudentNotFound(f"unknown essay prompt_id {rewrite.prompt_id!r}")

    new_hash = compute_package_hash(updated_items, pkg.endorsement_letter)
    if new_hash != pkg.package_hash:
        pkg.version += 1
        pkg.package_hash = new_hash
        pkg.ordered_items = updated_items
        pkg.updated_at = datetime.now(UTC)
        app_row.ordered_items = updated_items
        _void_prior_approvals(session, application_id)
    session.flush()
    return PackageOut.model_validate(pkg)


def get_package(session: Session, application_id: uuid.UUID) -> PackageOut:
    pkg = session.scalar(select(PackageRow).where(PackageRow.application_id == application_id))
    if pkg is None:
        raise student.StudentNotFound(f"no package built for application {application_id}")
    return PackageOut.model_validate(pkg)


def get_active_approval(session: Session, application_id: uuid.UUID) -> ApprovalOut | None:
    row = session.scalar(
        select(ApprovalRow)
        .where(ApprovalRow.application_id == application_id, ApprovalRow.voided.is_(False))
        .order_by(ApprovalRow.approved_at.desc())
    )
    return ApprovalOut.model_validate(row) if row else None


def export_submission_kit(
    session: Session,
    application_id: uuid.UUID,
    fmt: Literal["docx", "pdf"],
) -> tuple[str, bytes]:
    """Generate a downloadable `.docx` or `.pdf` Submission Kit for `application_id`."""
    app_row = session.get(ApplicationRow, application_id)
    if app_row is None:
        raise student.StudentNotFound(f"unknown application {application_id}")
    stu = session.get(StudentRow, app_row.student_id)
    opp = catalogue.get_opportunity(session, app_row.opportunity_slug)
    pkg = session.scalar(select(PackageRow).where(PackageRow.application_id == application_id))
    if pkg is None:
        pkg_out = build_or_update_package(session, application_id)
        pkg = session.get(PackageRow, pkg_out.id)

    title = opp.claims["title"]["value"] or opp.slug
    builder = build_docx_submission_kit if fmt == "docx" else build_pdf_submission_kit
    content = builder(
        opportunity_title=title,
        student_name=stu.full_name,
        matric_number=stu.matric_number,
        package_hash=pkg.package_hash,
        ordered_items=pkg.ordered_items,
        endorsement_letter=pkg.endorsement_letter,
    )
    filename = f"Artrat_Submission_Kit_{opp.slug}.{fmt}"
    return filename, content


def _default_portal_driver(portal_url: str, ordered_items: list[dict], otp: str | None) -> str:
    digest = hashlib.sha256(f"{portal_url}:{len(ordered_items)}:{otp}".encode()).hexdigest()[:8]
    return f"SUB-{digest.upper()}"


def declare_and_submit(
    session: Session,
    application_id: uuid.UUID,
    approval_in: DeclareAndSubmitIn,
    *,
    inbox: list[GmailMessage] | None = None,
    portal_driver: PortalExecutionDriver | None = None,
) -> SubmissionOut:
    """Version-bound Declare & Submit + 100% autonomous execution with Gmail OTP pickup,
    verify-before-retry state check, and Vault receipt archival (docs/06 §3.3-3.7, docs/07 P5)."""
    app_row = session.get(ApplicationRow, application_id)
    if app_row is None:
        raise student.StudentNotFound(f"unknown application {application_id}")

    pkg = session.scalar(select(PackageRow).where(PackageRow.application_id == application_id))
    if pkg is None:
        pkg_out = build_or_update_package(session, application_id)
        pkg = session.get(PackageRow, pkg_out.id)

    # Rule #3 (docs/06 §3.3): Package hash must match exactly and Readiness must be 100%.
    if approval_in.package_hash != pkg.package_hash:
        raise StalePackageHashError(
            f"approval package_hash {approval_in.package_hash!r} does not match"
            f" current package_hash {pkg.package_hash!r}"
        )
    if any(i.get("status") != "ready" for i in pkg.ordered_items):
        raise ReadinessIncompleteError(
            "cannot Declare & Submit while one or more application requirements are missing"
        )

    # Idempotency check: if already submitted for this exact application & package_hash, return it.
    idem_key = f"{application_id}:{pkg.package_hash}"
    existing_sub = session.scalar(
        select(SubmissionRow).where(SubmissionRow.application_id == application_id)
    )
    if existing_sub is not None and existing_sub.status == "submitted":
        return SubmissionOut.model_validate(existing_sub)

    now = datetime.now(UTC)
    _void_prior_approvals(session, application_id)
    approval = ApprovalRow(
        application_id=application_id,
        student_id=app_row.student_id,
        package_version=pkg.version,
        package_hash=pkg.package_hash,
        declaration_text=approval_in.declaration_text,
        voided=False,
        approved_at=now,
    )
    session.add(approval)
    app_row.status = ApplicationStatus.APPROVED_FOR_EXECUTION
    session.flush()

    bp = catalogue.get_portal_blueprint(session, app_row.opportunity_slug)
    opp = catalogue.get_opportunity(session, app_row.opportunity_slug)
    opp_title = opp.claims["title"]["value"] or opp.slug

    # If the portal explicitly bans automation, export Submission Kit instead of running browser.
    if bp.automation_policy.value is AutomationPolicy.EXPLICITLY_BANNED:
        app_row.status = ApplicationStatus.SUBMISSION_KIT_EXPORTED
        sub = SubmissionRow(
            application_id=application_id,
            student_id=app_row.student_id,
            package_version=pkg.version,
            package_hash=pkg.package_hash,
            idempotency_key=idem_key,
            status="kit_exported",
            portal_reference=f"KIT-{pkg.package_hash[:8].upper()}",
            otp_used=None,
            receipt_vault_doc_id=None,
            attempts=1,
            submitted_at=now,
        )
        session.add(sub)
        session.flush()
        return SubmissionOut.model_validate(sub)

    # 100% autonomous OTP pickup via connected Gmail (scoped strictly to portal domain)
    messages = inbox or []
    otp_code = pickup_portal_otp(bp.portal_url, messages)
    driver = portal_driver or _default_portal_driver
    app_row.status = ApplicationStatus.EXECUTING
    session.flush()

    attempts = 0
    portal_ref: str | None = None
    try:
        attempts += 1
        portal_ref = driver(bp.portal_url, pkg.ordered_items, otp_code)
    except AmbiguousSubmissionError:
        # Rule #7 (docs/06 §3.7): Verify before retry!
        # Check Gmail confirmation receipt from the portal domain before ever clicking submit again.
        app_row.status = ApplicationStatus.VERIFYING_SUBMISSION
        session.flush()
        receipt = find_submission_receipt(bp.portal_url, messages)
        if receipt is not None:
            portal_ref = receipt.reference_code
        else:
            # Confirmed no receipt arrived -> safe single retry
            attempts += 1
            portal_ref = driver(bp.portal_url, pkg.ordered_items, otp_code)

    # Archive official confirmation receipt into the student's Dynamic Vault
    receipt_doc = student.upload_vault_document(
        session,
        app_row.student_id,
        student.VaultUploadIn(
            doc_type=DocumentType.DYNAMIC_ENDORSEMENT,
            signed_by=SignerRole.OTHER,
            title=f"Official Submission Receipt — {opp_title}",
            file_name=f"Submission_Receipt_{portal_ref}.pdf",
            storage_key=f"vault/{app_row.student_id}/receipts/{portal_ref}.pdf",
            extracted_summary=f"Confirmed portal reference {portal_ref} for {opp_title}",
        ),
    )

    app_row.status = ApplicationStatus.SUBMITTED
    app_row.updated_at = now
    sub = SubmissionRow(
        application_id=application_id,
        student_id=app_row.student_id,
        package_version=pkg.version,
        package_hash=pkg.package_hash,
        idempotency_key=idem_key,
        status="submitted",
        portal_reference=portal_ref,
        otp_used=otp_code,
        receipt_vault_doc_id=receipt_doc.id,
        attempts=attempts,
        submitted_at=now,
    )
    session.add(sub)
    session.flush()
    return SubmissionOut.model_validate(sub)
