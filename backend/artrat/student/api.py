"""Public interface of the Student context (docs/04 §3, docs/06, docs/09)."""

import uuid
from datetime import UTC, date, datetime, timedelta

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from artrat.catalogue import api as catalogue
from artrat.catalogue.api import DocumentType, SignerRole
from artrat.student.matcher import MatchDecision, evaluate_eligibility
from artrat.student.tables import (
    ApplicationRow,
    ApplicationStatus,
    FactOrigin,
    ProfileFactRow,
    StudentRow,
    StudentTaskRow,
    StudentTaskStatus,
    VaultDocumentRow,
)

__all__ = [
    "ApplicationOut",
    "ApplicationStatus",
    "CurationOutcome",
    "FactOrigin",
    "ManualCompletionForbidden",
    "MatchDecision",
    "ProfileFactIn",
    "ProfileFactOut",
    "StudentIn",
    "StudentNotFound",
    "StudentOut",
    "StudentTaskOut",
    "StudentTaskStatus",
    "VaultDocumentOut",
    "VaultUploadIn",
    "compute_is_minor",
    "create_or_update_student",
    "curate_application",
    "get_student",
    "list_student_applications",
    "list_student_facts",
    "list_student_tasks",
    "list_vault_documents",
    "override_student_level",
    "reconcile_external_google_task_completion",
    "record_profile_fact",
    "upload_vault_document",
]


class StudentNotFound(LookupError):
    """The requested Student or Student resource does not exist."""


class ManualCompletionForbidden(ValueError):
    """Physical signature or document requirements cannot be marked complete without an upload."""


def compute_is_minor(dob: date, today: date | None = None) -> bool:
    """Under-18 detection for NDPA 2023 minor-safe privacy defaults (docs/06 §5, docs/09 §1.2)."""
    ref = today or datetime.now(UTC).date()
    years = ref.year - dob.year - ((ref.month, ref.day) < (dob.month, dob.day))
    return years < 18


class StudentIn(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    full_name: str = Field(min_length=2)
    date_of_birth: date
    institution: str = Field(min_length=2)
    department: str = Field(min_length=2)
    matric_number: str = Field(min_length=2)
    academic_level: str = Field(default="200 Level")
    autonomous_level_promotion: bool = True
    state_of_origin: str = Field(min_length=2)
    lga: str = Field(min_length=2)
    residential_address: str = Field(min_length=2)


class StudentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    full_name: str
    date_of_birth: date
    is_minor: bool
    institution: str
    department: str
    matric_number: str
    academic_level: str
    autonomous_level_promotion: bool
    state_of_origin: str
    lga: str
    residential_address: str
    updated_at: datetime


class ProfileFactIn(BaseModel):
    key: str = Field(min_length=1, max_length=80)
    label: str = Field(min_length=1)
    value: str = Field(min_length=1)
    origin: FactOrigin = FactOrigin.SELF_REPORTED
    source_detail: str = Field(min_length=1)
    document_id: uuid.UUID | None = None


class ProfileFactOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    student_id: uuid.UUID
    key: str
    label: str
    value: str
    origin: FactOrigin
    source_detail: str
    document_id: uuid.UUID | None
    updated_at: datetime


class VaultUploadIn(BaseModel):
    doc_type: DocumentType
    signed_by: SignerRole | None = None
    title: str = Field(min_length=1)
    file_name: str = Field(min_length=1)
    storage_key: str = Field(min_length=1)
    extracted_summary: str = Field(min_length=1)
    extracted_facts: tuple[ProfileFactIn, ...] = ()


class VaultDocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    student_id: uuid.UUID
    doc_type: DocumentType
    signed_by: SignerRole | None
    title: str
    file_name: str
    storage_key: str
    extracted_summary: str
    uploaded_at: datetime


class ApplicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    student_id: uuid.UUID
    opportunity_id: uuid.UUID
    opportunity_slug: str
    status: ApplicationStatus
    ordered_items: list[dict]
    updated_at: datetime


class StudentTaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    student_id: uuid.UUID
    application_id: uuid.UUID
    checklist_item_key: str
    title: str
    doc_type: DocumentType
    signed_by: SignerRole | None
    status: StudentTaskStatus
    manual_completion_allowed: bool
    google_task_id: str | None
    google_calendar_event_id: str | None
    sync_status: str
    interval_hours: int
    last_triggered_at: datetime
    next_trigger_at: datetime


class CurationOutcome(BaseModel):
    eligible: bool
    failed_hard_rules: list[str]
    application: ApplicationOut | None = None


def create_or_update_student(session: Session, draft: StudentIn) -> StudentOut:
    now = datetime.now(UTC)
    minor = compute_is_minor(draft.date_of_birth, now.date())
    email = draft.email.strip().lower()
    row = session.scalar(select(StudentRow).where(StudentRow.email == email))
    if row is None:
        row = StudentRow(
            email=email,
            full_name=draft.full_name,
            date_of_birth=draft.date_of_birth,
            is_minor=minor,
            institution=draft.institution,
            department=draft.department,
            matric_number=draft.matric_number,
            academic_level=draft.academic_level,
            autonomous_level_promotion=draft.autonomous_level_promotion,
            state_of_origin=draft.state_of_origin,
            lga=draft.lga,
            residential_address=draft.residential_address,
            created_at=now,
            updated_at=now,
        )
        session.add(row)
    else:
        row.full_name = draft.full_name
        row.date_of_birth = draft.date_of_birth
        row.is_minor = minor
        row.institution = draft.institution
        row.department = draft.department
        row.matric_number = draft.matric_number
        row.academic_level = draft.academic_level
        row.autonomous_level_promotion = draft.autonomous_level_promotion
        row.state_of_origin = draft.state_of_origin
        row.lga = draft.lga
        row.residential_address = draft.residential_address
        row.updated_at = now
    session.flush()
    return StudentOut.model_validate(row)


def get_student(session: Session, student_id: uuid.UUID) -> StudentOut:
    row = session.get(StudentRow, student_id)
    if row is None:
        raise StudentNotFound(f"unknown student {student_id}")
    return StudentOut.model_validate(row)


def override_student_level(
    session: Session, student_id: uuid.UUID, academic_level: str
) -> StudentOut:
    """Manual force-level override in Settings (docs/09 §2.4): disables autonomous promotion."""
    row = session.get(StudentRow, student_id)
    if row is None:
        raise StudentNotFound(f"unknown student {student_id}")
    row.academic_level = academic_level
    row.autonomous_level_promotion = False
    row.updated_at = datetime.now(UTC)
    session.flush()
    return StudentOut.model_validate(row)


def record_profile_fact(
    session: Session, student_id: uuid.UUID, fact: ProfileFactIn
) -> ProfileFactOut:
    if session.get(StudentRow, student_id) is None:
        raise StudentNotFound(f"unknown student {student_id}")
    now = datetime.now(UTC)
    row = session.scalar(
        select(ProfileFactRow).where(
            ProfileFactRow.student_id == student_id, ProfileFactRow.key == fact.key
        )
    )
    if row is None:
        row = ProfileFactRow(
            student_id=student_id,
            key=fact.key,
            label=fact.label,
            value=fact.value,
            origin=fact.origin,
            source_detail=fact.source_detail,
            document_id=fact.document_id,
            updated_at=now,
        )
        session.add(row)
    else:
        row.label = fact.label
        row.value = fact.value
        row.origin = fact.origin
        row.source_detail = fact.source_detail
        row.document_id = fact.document_id
        row.updated_at = now
    session.flush()
    return ProfileFactOut.model_validate(row)


def list_student_facts(session: Session, student_id: uuid.UUID) -> list[ProfileFactOut]:
    rows = session.scalars(
        select(ProfileFactRow)
        .where(ProfileFactRow.student_id == student_id)
        .order_by(ProfileFactRow.key)
    ).all()
    return [ProfileFactOut.model_validate(r) for r in rows]


def _sync_vault_doc_to_applications_and_tasks(
    session: Session, student_id: uuid.UUID, doc: VaultDocumentRow
) -> None:
    """Global Vault sync: satisfy matching slots across all Applications and close open Tasks."""
    now = datetime.now(UTC)
    apps = session.scalars(
        select(ApplicationRow).where(ApplicationRow.student_id == student_id)
    ).all()
    for app in apps:
        changed = False
        new_items: list[dict] = []
        for item in app.ordered_items:
            if (
                item.get("kind") == "upload"
                and item.get("doc_type") == doc.doc_type.value
                and item.get("signed_by") == (doc.signed_by.value if doc.signed_by else None)
            ):
                item = {
                    **item,
                    "status": "ready",
                    "document_id": str(doc.id),
                    "file_name": doc.file_name,
                }
                changed = True
            new_items.append(item)
        if changed:
            app.ordered_items = new_items
            app.updated_at = now
            if all(i.get("status") == "ready" for i in new_items) and (
                app.status is ApplicationStatus.WAITING_FOR_REQUIREMENTS
            ):
                app.status = ApplicationStatus.READY_FOR_REVIEW

    tasks = session.scalars(
        select(StudentTaskRow).where(
            StudentTaskRow.student_id == student_id,
            StudentTaskRow.doc_type == doc.doc_type,
            StudentTaskRow.signed_by == doc.signed_by,
            StudentTaskRow.status == StudentTaskStatus.OPEN,
        )
    ).all()
    for t in tasks:
        t.status = StudentTaskStatus.SATISFIED
        t.sync_status = "completed_in_google_tasks"
        t.last_triggered_at = now


def upload_vault_document(
    session: Session, student_id: uuid.UUID, upload: VaultUploadIn
) -> VaultDocumentOut:
    """Save a document to the Dynamic Vault, extract ProfileFacts, and sync globally."""
    if session.get(StudentRow, student_id) is None:
        raise StudentNotFound(f"unknown student {student_id}")
    now = datetime.now(UTC)
    row = session.scalar(
        select(VaultDocumentRow).where(
            VaultDocumentRow.student_id == student_id,
            VaultDocumentRow.doc_type == upload.doc_type,
            VaultDocumentRow.signed_by == upload.signed_by,
        )
    )
    if row is None:
        row = VaultDocumentRow(
            student_id=student_id,
            doc_type=upload.doc_type,
            signed_by=upload.signed_by,
            title=upload.title,
            file_name=upload.file_name,
            storage_key=upload.storage_key,
            extracted_summary=upload.extracted_summary,
            uploaded_at=now,
        )
        session.add(row)
        session.flush()
    else:
        row.title = upload.title
        row.file_name = upload.file_name
        row.storage_key = upload.storage_key
        row.extracted_summary = upload.extracted_summary
        row.uploaded_at = now
        session.flush()

    for fact in upload.extracted_facts:
        record_profile_fact(
            session,
            student_id,
            ProfileFactIn(
                key=fact.key,
                label=fact.label,
                value=fact.value,
                origin=FactOrigin.DOCUMENT_EXTRACTED,
                source_detail=fact.source_detail,
                document_id=row.id,
            ),
        )

    _sync_vault_doc_to_applications_and_tasks(session, student_id, row)
    session.flush()
    return VaultDocumentOut.model_validate(row)


def list_vault_documents(session: Session, student_id: uuid.UUID) -> list[VaultDocumentOut]:
    rows = session.scalars(
        select(VaultDocumentRow)
        .where(VaultDocumentRow.student_id == student_id)
        .order_by(VaultDocumentRow.uploaded_at.desc())
    ).all()
    return [VaultDocumentOut.model_validate(r) for r in rows]


def curate_application(
    session: Session, student_id: uuid.UUID, opportunity_slug: str
) -> CurationOutcome:
    """Match a student against an Opportunity and prepare the Application in exact PortalBlueprint
    sequence (docs/04 §3.4, docs/05 §4, docs/06 §3.2)."""
    student = session.get(StudentRow, student_id)
    if student is None:
        raise StudentNotFound(f"unknown student {student_id}")

    opp = catalogue.get_opportunity(session, opportunity_slug)
    # Rule #2 (docs/06 §3.2): Portal Inspection before preparation.
    bp = catalogue.get_portal_blueprint(session, opportunity_slug)

    facts = {
        f.key: f
        for f in session.scalars(
            select(ProfileFactRow).where(ProfileFactRow.student_id == student_id)
        ).all()
    }
    decision = evaluate_eligibility(student, facts, opp)
    if not decision.eligible:
        return CurationOutcome(
            eligible=False, failed_hard_rules=decision.failed_hard_rules, application=None
        )

    vault_docs = {
        (d.doc_type, d.signed_by): d
        for d in session.scalars(
            select(VaultDocumentRow).where(VaultDocumentRow.student_id == student_id)
        ).all()
    }

    now = datetime.now(UTC)
    ordered_items: list[dict] = []
    missing_uploads: list[catalogue.PortalUploadSpec] = []
    seq = 1

    for f in bp.fields:
        val = student.full_name
        if f.name == "matric_number":
            val = student.matric_number
        elif f.name == "cgpa" and "cgpa" in facts:
            val = facts["cgpa"].value
        ordered_items.append(
            {
                "sequence": seq,
                "kind": "field",
                "name": f.name,
                "label": f.label,
                "value": val,
                "status": "ready",
            }
        )
        seq += 1

    for u in bp.uploads:
        matched_doc = vault_docs.get((u.doc_type, u.signed_by))
        if matched_doc is not None:
            ordered_items.append(
                {
                    "sequence": seq,
                    "kind": "upload",
                    "name": u.name,
                    "label": u.label,
                    "doc_type": u.doc_type.value,
                    "signed_by": u.signed_by.value if u.signed_by else None,
                    "document_id": str(matched_doc.id),
                    "file_name": matched_doc.file_name,
                    "status": "ready",
                }
            )
        else:
            missing_uploads.append(u)
            ordered_items.append(
                {
                    "sequence": seq,
                    "kind": "upload",
                    "name": u.name,
                    "label": u.label,
                    "doc_type": u.doc_type.value,
                    "signed_by": u.signed_by.value if u.signed_by else None,
                    "document_id": None,
                    "file_name": None,
                    "status": "missing",
                }
            )
        seq += 1

    for e in bp.essay_prompts:
        ordered_items.append(
            {
                "sequence": seq,
                "kind": "essay",
                "prompt_id": e.prompt_id,
                "prompt": e.prompt,
                "word_limit": e.word_limit,
                "status": "ready",
            }
        )
        seq += 1

    status = (
        ApplicationStatus.WAITING_FOR_REQUIREMENTS
        if missing_uploads
        else ApplicationStatus.READY_FOR_REVIEW
    )

    app_row = session.scalar(
        select(ApplicationRow).where(
            ApplicationRow.student_id == student_id,
            ApplicationRow.opportunity_id == opp.id,
        )
    )
    if app_row is None:
        app_row = ApplicationRow(
            student_id=student_id,
            opportunity_id=opp.id,
            opportunity_slug=opp.slug,
            status=status,
            ordered_items=ordered_items,
            created_at=now,
            updated_at=now,
        )
        session.add(app_row)
        session.flush()
    else:
        app_row.status = status
        app_row.ordered_items = ordered_items
        app_row.updated_at = now
        session.flush()

    for u in missing_uploads:
        item_key = f"{app_row.id}:{u.name}"
        existing_task = session.scalar(
            select(StudentTaskRow).where(StudentTaskRow.checklist_item_key == item_key)
        )
        if existing_task is None:
            session.add(
                StudentTaskRow(
                    student_id=student_id,
                    application_id=app_row.id,
                    checklist_item_key=item_key,
                    title=f"Upload {u.label} for {opp.claims['title']['value']}",
                    doc_type=u.doc_type,
                    signed_by=u.signed_by,
                    status=StudentTaskStatus.OPEN,
                    manual_completion_allowed=False,
                    google_task_id=f"gtask-{uuid.uuid4().hex[:10]}",
                    google_calendar_event_id=f"gcal-{uuid.uuid4().hex[:10]}",
                    sync_status="synced",
                    interval_hours=12,
                    last_triggered_at=now,
                    next_trigger_at=now + timedelta(hours=12),
                )
            )
    session.flush()
    return CurationOutcome(
        eligible=True,
        failed_hard_rules=[],
        application=ApplicationOut.model_validate(app_row),
    )


def reconcile_external_google_task_completion(
    session: Session, task_id: uuid.UUID
) -> StudentTaskOut:
    """Rule #5 (docs/06 §3.5, docs/07 P3 exit gate):
    If a student marks a synced Google Task complete externally without uploading the required
    document in Artrat, re-open the Google Task automatically."""
    task = session.get(StudentTaskRow, task_id)
    if task is None:
        raise StudentNotFound(f"unknown task {task_id}")

    has_doc = (
        session.scalar(
            select(VaultDocumentRow.id).where(
                VaultDocumentRow.student_id == task.student_id,
                VaultDocumentRow.doc_type == task.doc_type,
                VaultDocumentRow.signed_by == task.signed_by,
            )
        )
        is not None
    )
    now = datetime.now(UTC)
    if not has_doc and not task.manual_completion_allowed:
        task.status = StudentTaskStatus.OPEN
        task.sync_status = "reopened_in_google_tasks"
        task.last_triggered_at = now
        task.next_trigger_at = now + timedelta(hours=task.interval_hours)
    else:
        task.status = StudentTaskStatus.SATISFIED
        task.sync_status = "completed_in_google_tasks"
        task.last_triggered_at = now
    session.flush()
    return StudentTaskOut.model_validate(task)


def list_student_applications(session: Session, student_id: uuid.UUID) -> list[ApplicationOut]:
    rows = session.scalars(
        select(ApplicationRow)
        .where(ApplicationRow.student_id == student_id)
        .order_by(ApplicationRow.updated_at.desc())
    ).all()
    return [ApplicationOut.model_validate(r) for r in rows]


def list_student_tasks(session: Session, student_id: uuid.UUID) -> list[StudentTaskOut]:
    rows = session.scalars(
        select(StudentTaskRow)
        .where(StudentTaskRow.student_id == student_id)
        .order_by(StudentTaskRow.next_trigger_at)
    ).all()
    return [StudentTaskOut.model_validate(r) for r in rows]
