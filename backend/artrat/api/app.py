import uuid
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Annotated, Literal

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from artrat.catalogue import api as catalogue
from artrat.integrations.bank_statement import (
    BankStatementNotRequired,
    pull_on_request_bank_statement,
)
from artrat.integrations.google import GmailMessage
from artrat.llm.gateway import GatewayError, MissingApiKey, OpenRouterGateway
from artrat.platform.config import get_settings
from artrat.platform.db import get_engine, session_scope
from artrat.platform.urls import BlockedUrl, assert_public_http_url
from artrat.research import frontier
from artrat.research.agent import LINK_DROP_PRIORITY
from artrat.research.directions import ResearchDirectionOut, ensure_default_directions
from artrat.research.learning import LearnedSignalOut, sync_learned_signals_from_db
from artrat.research.links import canonical_url, resolve_dropped_link
from artrat.research.tables import TaskKind
from artrat.student import api as student
from artrat.submission import api as submission
from artrat.submission.google_forms import fill_and_submit_google_form


def get_session():
    with session_scope() as session:
        yield session


DbSession = Annotated[Session, Depends(get_session)]
Limit = Annotated[int, Query(ge=1, le=200)]


class LinkDropIn(BaseModel):
    url: str = Field(min_length=1)


class LinkDropOut(BaseModel):
    queued: bool
    canonical_url: str


class SemesterCheckIn(BaseModel):
    university_name: str = Field(min_length=2)
    url: str = Field(min_length=1)


class SemesterCheckOut(BaseModel):
    queued: bool
    short_code: str
    canonical_url: str


class LevelOverrideIn(BaseModel):
    academic_level: str = Field(min_length=3)


class BankStatementPullIn(BaseModel):
    provider: str = "mono"
    institution_name: str = "Access Bank"
    account_masked: str = "****3410"
    months: int = Field(default=6, ge=1, le=24)


class GmailMsgIn(BaseModel):
    message_id: str
    sender_email: str
    subject: str
    body_text: str


class SubmitRequestIn(BaseModel):
    package_hash: str = Field(min_length=8)
    declaration_text: str = Field(min_length=5)
    inbox: list[GmailMsgIn] = Field(default_factory=list)


class ChatRequestIn(BaseModel):
    message: str = Field(min_length=1)
    student_id: uuid.UUID | None = None
    media_data_url: str | None = None
    audio_data_url: str | None = None
    output_format: Literal["text", "json", "audio"] = "text"
    context: str | None = None


class ChatResponseOut(BaseModel):
    reply: str
    output_format: Literal["text", "json", "audio"]
    reasoning_model: str
    media_model_used: str | None = None
    audio_model_used: str | None = None
    media_extracted: str | None = None
    audio_transcribed: str | None = None
    audio_output: str | None = None
    reasoning_steps: list[str] = Field(default_factory=list)
    actions: list[dict] = Field(default_factory=list)


class FormFillIn(BaseModel):
    form_url: str = Field(min_length=10)
    submit: bool = True


class FormFillOut(BaseModel):
    form_title: str
    form_url: str
    action_url: str
    submitted: bool
    status_code: int
    confirmation_message: str
    page_history: str
    answers: dict[str, str | list[str]]
    questions: list[dict]


@asynccontextmanager
async def lifespan(_: FastAPI):
    get_engine()  # misconfiguration (e.g. no ARTRAT_DATABASE_URL) stops startup, not each request
    yield


app = FastAPI(title="Artrat API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health(session: DbSession) -> dict[str, str]:
    session.execute(text("select 1"))
    return {"status": "ok", "database": "ok"}


@app.get("/v1/sources", response_model=list[catalogue.SourceOut])
def sources(session: DbSession, limit: Limit = 50) -> list[catalogue.SourceOut]:
    return catalogue.list_sources(session, limit)


@app.get("/v1/opportunities", response_model=list[catalogue.OpportunityOut])
def opportunities(session: DbSession, limit: Limit = 50) -> list[catalogue.OpportunityOut]:
    return catalogue.list_opportunities(session, limit)


@app.get("/v1/opportunities/{slug}", response_model=catalogue.OpportunityOut)
def opportunity_by_slug(slug: str, session: DbSession) -> catalogue.OpportunityOut:
    try:
        return catalogue.get_opportunity(session, slug)
    except catalogue.NotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/v1/opportunities/{slug}/blueprint", response_model=catalogue.PortalBlueprintOut)
def opportunity_blueprint(slug: str, session: DbSession) -> catalogue.PortalBlueprintOut:
    try:
        return catalogue.get_portal_blueprint(session, slug)
    except catalogue.NotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/v1/universities/semesters", response_model=list[catalogue.UniversitySemesterOut])
def university_semesters(session: DbSession) -> list[catalogue.UniversitySemesterOut]:
    return catalogue.list_university_semesters(session)


@app.get("/v1/universities/{short_code}/semester", response_model=catalogue.UniversitySemesterOut)
def university_semester_by_code(
    short_code: str, session: DbSession
) -> catalogue.UniversitySemesterOut:
    try:
        return catalogue.get_university_semester(session, short_code)
    except catalogue.NotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/v1/universities/{short_code}/check-semester", response_model=SemesterCheckOut)
def queue_university_semester_check(
    short_code: str, body: SemesterCheckIn, session: DbSession
) -> SemesterCheckOut:
    try:
        checked = assert_public_http_url(body.url)
    except BlockedUrl as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    code = short_code.strip().upper()
    canon = canonical_url(checked)
    queued = frontier.enqueue(
        session,
        TaskKind.CHECK_UNIVERSITY_SEMESTER,
        checked,
        depth=0,
        priority=4.0,
        reason={"university_semester_check": code},
        settings=get_settings(),
        key=f"{code}:{canon}",
        payload={"short_code": code, "university_name": body.university_name},
    )
    return SemesterCheckOut(queued=queued, short_code=code, canonical_url=canon)


@app.get("/v1/research/status")
def research_status(session: DbSession) -> dict[str, int]:
    """Frontier task counts by status, for operators."""
    return frontier.status_counts(session)


@app.get("/v1/research/directions", response_model=list[ResearchDirectionOut])
def research_directions(session: DbSession) -> list[ResearchDirectionOut]:
    """Active Research Directions and their Thompson-sampling + UCB1 + LinUCB yield counters."""
    return ensure_default_directions(session)


@app.get("/v1/research/learned-signals", response_model=list[LearnedSignalOut])
def research_learned_signals(session: DbSession) -> list[LearnedSignalOut]:
    """Self-learned empirical Bayesian weights for anchor phrases, funding cues, and domains."""
    return sync_learned_signals_from_db(session)


@app.post("/v1/research/link-drop", response_model=LinkDropOut)
def link_drop(body: LinkDropIn, session: DbSession) -> LinkDropOut:
    """Student link-drop enrichment (docs/05 §1.4): prioritize an uncaptured scholarship URL."""
    try:
        checked = resolve_dropped_link(body.url, guard=assert_public_http_url)
    except BlockedUrl as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    queued = frontier.enqueue(
        session,
        TaskKind.FETCH,
        checked,
        depth=0,
        priority=LINK_DROP_PRIORITY,
        reason={"link_drop": True, "raw_input": body.url},
        settings=get_settings(),
    )
    return LinkDropOut(queued=queued, canonical_url=canonical_url(checked))


@app.post("/v1/students", response_model=student.StudentOut)
def upsert_student(body: student.StudentIn, session: DbSession) -> student.StudentOut:
    return student.create_or_update_student(session, body)


@app.get("/v1/students/{student_id}", response_model=student.StudentOut)
def get_student_by_id(student_id: uuid.UUID, session: DbSession) -> student.StudentOut:
    try:
        return student.get_student(session, student_id)
    except student.StudentNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/v1/students/{student_id}/level-override", response_model=student.StudentOut)
def level_override(
    student_id: uuid.UUID, body: LevelOverrideIn, session: DbSession
) -> student.StudentOut:
    try:
        return student.override_student_level(session, student_id, body.academic_level)
    except student.StudentNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/v1/students/{student_id}/facts", response_model=student.ProfileFactOut)
def upsert_student_fact(
    student_id: uuid.UUID, body: student.ProfileFactIn, session: DbSession
) -> student.ProfileFactOut:
    try:
        return student.record_profile_fact(session, student_id, body)
    except student.StudentNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/v1/students/{student_id}/facts", response_model=list[student.ProfileFactOut])
def student_facts(student_id: uuid.UUID, session: DbSession) -> list[student.ProfileFactOut]:
    return student.list_student_facts(session, student_id)


@app.post("/v1/students/{student_id}/vault", response_model=student.VaultDocumentOut)
def upload_to_vault(
    student_id: uuid.UUID, body: student.VaultUploadIn, session: DbSession
) -> student.VaultDocumentOut:
    try:
        return student.upload_vault_document(session, student_id, body)
    except student.StudentNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/v1/students/{student_id}/vault", response_model=list[student.VaultDocumentOut])
def student_vault(student_id: uuid.UUID, session: DbSession) -> list[student.VaultDocumentOut]:
    return student.list_vault_documents(session, student_id)


@app.post(
    "/v1/students/{student_id}/bank-statement/pull", response_model=student.VaultDocumentOut
)
def pull_bank_statement(
    student_id: uuid.UUID, body: BankStatementPullIn, session: DbSession
) -> student.VaultDocumentOut:
    try:
        return pull_on_request_bank_statement(
            session,
            student_id,
            provider=body.provider,
            institution_name=body.institution_name,
            account_masked=body.account_masked,
            months=body.months,
        )
    except student.StudentNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except BankStatementNotRequired as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc


@app.post(
    "/v1/students/{student_id}/evidence-ledger", response_model=submission.EvidenceLedgerOut
)
def create_ledger_entry(
    student_id: uuid.UUID, body: submission.EvidenceLedgerIn, session: DbSession
) -> submission.EvidenceLedgerOut:
    try:
        return submission.add_evidence_ledger_entry(session, student_id, body)
    except student.StudentNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get(
    "/v1/students/{student_id}/evidence-ledger",
    response_model=list[submission.EvidenceLedgerOut],
)
def get_ledger_entries(
    student_id: uuid.UUID, session: DbSession
) -> list[submission.EvidenceLedgerOut]:
    return submission.list_evidence_ledger(session, student_id)


@app.post(
    "/v1/students/{student_id}/applications/{opportunity_slug}/curate",
    response_model=student.CurationOutcome,
)
def curate_student_application(
    student_id: uuid.UUID, opportunity_slug: str, session: DbSession
) -> student.CurationOutcome:
    try:
        return student.curate_application(session, student_id, opportunity_slug)
    except (student.StudentNotFound, catalogue.NotFound) as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/v1/students/{student_id}/applications", response_model=list[student.ApplicationOut])
def student_applications(
    student_id: uuid.UUID, session: DbSession
) -> list[student.ApplicationOut]:
    return student.list_student_applications(session, student_id)


@app.get("/v1/students/{student_id}/tasks", response_model=list[student.StudentTaskOut])
def student_tasks(student_id: uuid.UUID, session: DbSession) -> list[student.StudentTaskOut]:
    return student.list_student_tasks(session, student_id)


@app.post("/v1/tasks/{task_id}/google-tasks-webhook", response_model=student.StudentTaskOut)
def google_tasks_completion_webhook(
    task_id: uuid.UUID, session: DbSession
) -> student.StudentTaskOut:
    try:
        return student.reconcile_external_google_task_completion(session, task_id)
    except student.StudentNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/v1/applications/{application_id}/package", response_model=submission.PackageOut)
def build_application_package(
    application_id: uuid.UUID, body: submission.PackageBuildIn, session: DbSession
) -> submission.PackageOut:
    try:
        return submission.build_or_update_package(
            session,
            application_id,
            signer_role=body.signer_role,
            recipient_address=body.recipient_address,
        )
    except (student.StudentNotFound, catalogue.NotFound) as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except submission.UnsupportedClaimError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.get("/v1/applications/{application_id}/package", response_model=submission.PackageOut)
def get_application_package(
    application_id: uuid.UUID, session: DbSession
) -> submission.PackageOut:
    try:
        return submission.get_package(session, application_id)
    except student.StudentNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post(
    "/v1/applications/{application_id}/canvas-rewrite", response_model=submission.PackageOut
)
def canvas_rewrite(
    application_id: uuid.UUID, body: submission.CanvasRewriteIn, session: DbSession
) -> submission.PackageOut:
    try:
        return submission.canvas_rewrite_application_essay(session, application_id, body)
    except student.StudentNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except (submission.UnsupportedClaimError, submission.WordLimitExceededError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.get("/v1/applications/{application_id}/submission-kit/{fmt}")
def download_submission_kit(
    application_id: uuid.UUID, fmt: Literal["docx", "pdf"], session: DbSession
) -> Response:
    try:
        filename, content = submission.export_submission_kit(session, application_id, fmt)
    except (student.StudentNotFound, catalogue.NotFound) as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    media_type = (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        if fmt == "docx"
        else "application/pdf"
    )
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.post(
    "/v1/applications/{application_id}/declare-and-submit",
    response_model=submission.SubmissionOut,
)
def declare_and_submit_endpoint(
    application_id: uuid.UUID, body: SubmitRequestIn, session: DbSession
) -> submission.SubmissionOut:
    now = datetime.now(UTC)
    inbox = [
        GmailMessage(
            message_id=m.message_id,
            sender_email=m.sender_email,
            subject=m.subject,
            body_text=m.body_text,
            received_at=now,
        )
        for m in body.inbox
    ]
    try:
        return submission.declare_and_submit(
            session,
            application_id,
            submission.DeclareAndSubmitIn(
                package_hash=body.package_hash,
                declaration_text=body.declaration_text,
            ),
            inbox=inbox,
        )
    except (student.StudentNotFound, catalogue.NotFound) as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except (submission.StalePackageHashError, submission.ReadinessIncompleteError) as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@app.post("/v1/chat", response_model=ChatResponseOut)
def chat_endpoint(body: ChatRequestIn, session: DbSession) -> ChatResponseOut:
    """Multimodal student chat endpoint:
    - `baidu/ernie-5.5-flash-preview:free` for text and core reasoning across all inputs
    - `nvidia/nemotron-3.5-super-vl:free` (`super vl`) for media inputs
    - `fish-audio/s2.1-pro-free:free` for audio inputs/outputs
    Automatically injects the student's live profile, Vault, and catalogue context when available.
    """
    enriched_context = body.context or ""
    if body.student_id is not None:
        try:
            stu = student.get_student(session, body.student_id)
            docs = student.list_vault_documents(session, body.student_id)
            facts = student.list_student_facts(session, body.student_id)
            stu_block = (
                f"Student: {stu.full_name} ({stu.academic_level}, {stu.department} at {stu.institution}, "
                f"State/LGA: {stu.state_of_origin}/{stu.lga})\n"
                f"Vault Documents ({len(docs)}): {', '.join(d.title for d in docs)}\n"
                f"Profile Facts: {', '.join(f'{f.key}={f.value}' for f in facts)}"
            )
            enriched_context = f"{stu_block}\n{enriched_context}".strip()
        except student.StudentNotFound:
            pass
    try:
        gateway = OpenRouterGateway(get_settings())
        result = gateway.chat(
            message=body.message,
            media_data_url=body.media_data_url,
            audio_data_url=body.audio_data_url,
            output_format=body.output_format,
            context=enriched_context or None,
        )
        return ChatResponseOut.model_validate(result)
    except MissingApiKey as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except GatewayError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/v1/forms/fill", response_model=FormFillOut)
def fill_form_endpoint(body: FormFillIn) -> FormFillOut:
    """Autonomously inspect all sections/pages of a Google Form, generate student-grounded
    answers, and submit the form."""
    try:
        outcome = fill_and_submit_google_form(
            body.form_url,
            get_settings(),
            submit=body.submit,
        )
        return FormFillOut(
            form_title=outcome.form_title,
            form_url=outcome.form_url,
            action_url=outcome.action_url,
            submitted=outcome.submitted,
            status_code=outcome.status_code,
            confirmation_message=outcome.confirmation_message,
            page_history=outcome.page_history,
            answers=outcome.answers,
            questions=outcome.questions,
        )
    except BlockedUrl as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
