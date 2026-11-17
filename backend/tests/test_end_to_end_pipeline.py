"""End-to-end tests for Phases 4, 5, and 6:
- On-request Mono/Okra Bank Statement connector scoping (docs/06 §3.6)
- Evidence Ledger, Gemini Canvas live rewrite, and Zero-Fabrication Gate (P4 exit gate)
- Downloadable .DOCX and .PDF Submission Kits (Non-negotiable #6)
- Version-bound Declare & Submit, scoped Gmail OTP pickup, Vault receipt archival, and the
  ambiguous-submit Verify-Before-Retry drill with zero duplicate submissions (P5 exit gate).
"""

import io
import uuid
import zipfile
from datetime import UTC, date, datetime

from fastapi.testclient import TestClient

from artrat.api.app import app
from artrat.catalogue import api as catalogue
from artrat.catalogue.api import (
    AutomationPolicy,
    Claim,
    DocumentType,
    EvidenceRef,
    FetchMode,
    OpportunityDraft,
    PortalBlueprintDraft,
    PortalEssaySpec,
    PortalFieldSpec,
    PortalUploadSpec,
    SignerRole,
    SnapshotIn,
    Verification,
)
from artrat.integrations.google import GmailMessage
from artrat.integrations.whatsapp import NotificationDispatcher
from artrat.submission import api as submission

NOW = datetime(2026, 11, 17, tzinfo=UTC)


def _setup_ready_application(session, client: TestClient) -> tuple[str, str]:
    text = (
        "NLNG Undergraduate Scholarship 2026/2027\n"
        "Applications close on 30 June 2027.\n"
        "Apply at https://portal.nlng.com/apply\n"
    )
    src = catalogue.store_snapshot(
        session,
        SnapshotIn(
            url="https://nlng.com/scholarship",
            final_url="https://nlng.com/scholarship",
            status_code=200,
            fetch_mode=FetchMode.STATIC,
            title="NLNG",
            text=text,
            retrieved_at=NOW,
        ),
    )
    ev = (
        EvidenceRef(
            source_id=str(src.id),
            url=src.final_url,
            passage="NLNG Undergraduate Scholarship 2026/2027",
            retrieved_at=NOW,
        ),
    )
    catalogue.record_opportunity(
        session,
        OpportunityDraft(
            slug="nlng-e2e-2026-2027",
            cycle="2026/2027",
            title=Claim[str](
                value="NLNG Undergraduate Scholarship",
                verification=Verification.OFFICIAL,
                evidence=ev,
                last_verified_at=NOW,
            ),
            official_url=Claim[str](
                value="https://nlng.com/scholarship",
                verification=Verification.OFFICIAL,
                evidence=ev,
                last_verified_at=NOW,
            ),
            application_url=Claim[str](
                value="https://portal.nlng.com/apply",
                verification=Verification.OFFICIAL,
                evidence=ev,
                last_verified_at=NOW,
            ),
            deadline=Claim[datetime](
                value=datetime(2027, 6, 30, 23, 59, tzinfo=UTC),
                verification=Verification.OFFICIAL,
                evidence=ev,
                last_verified_at=NOW,
            ),
        ),
    )
    catalogue.record_portal_blueprint(
        session,
        PortalBlueprintDraft(
            opportunity_slug="nlng-e2e-2026-2027",
            portal_url="https://portal.nlng.com/apply",
            fields=(
                PortalFieldSpec(name="full_name", label="Full Name"),
                PortalFieldSpec(name="matric_number", label="Matriculation Number"),
            ),
            uploads=(
                PortalUploadSpec(
                    name="school_admission_letter",
                    label="University Admission Letter",
                    doc_type=DocumentType.SCHOOL_ADMISSION_LETTER,
                ),
                PortalUploadSpec(
                    name="jamb_admission_letter",
                    label="JAMB CAPS Admission Letter",
                    doc_type=DocumentType.JAMB_ADMISSION_LETTER,
                ),
                PortalUploadSpec(
                    name="bank_statement",
                    label="6-Month Bank Statement",
                    doc_type=DocumentType.BANK_STATEMENT,
                ),
            ),
            essay_prompts=(
                PortalEssaySpec(
                    prompt_id="essay-1",
                    prompt="Describe your engineering project and community impact",
                    word_limit=120,
                ),
            ),
            declarations=("I hereby declare that all information is true.",),
            automation_policy=Claim[AutomationPolicy](
                value=AutomationPolicy.PERMITTED,
                verification=Verification.OFFICIAL,
                evidence=ev,
                last_verified_at=NOW,
            ),
        ),
    )
    session.commit()

    stu = client.post(
        "/v1/students",
        json={
            "email": "chisom.okafor.248912@unn.edu.ng",
            "full_name": "Chisom Kamsiyochukwu Okafor",
            "date_of_birth": str(date(2009, 5, 14)),
            "institution": "University of Nigeria, Nsukka (UNN)",
            "department": "B.Eng Electrical Engineering",
            "matric_number": "2024/248912",
            "academic_level": "200 Level",
            "state_of_origin": "Anambra",
            "lga": "Njikoka",
            "residential_address": "Room 214, Kwame Nkrumah Hall, UNN",
        },
    ).json()
    student_id = stu["id"]

    # Before curating an application that needs a bank statement, Mono/Okra pull is refused!
    denied = client.post(f"/v1/students/{student_id}/bank-statement/pull", json={})
    assert denied.status_code == 403

    # Upload separate School and JAMB Admission Letters
    for doc_type, fname in (
        (DocumentType.SCHOOL_ADMISSION_LETTER.value, "UNN_Admission_Letter.pdf"),
        (DocumentType.JAMB_ADMISSION_LETTER.value, "JAMB_CAPS_Admission_Letter.pdf"),
    ):
        client.post(
            f"/v1/students/{student_id}/vault",
            json={
                "doc_type": doc_type,
                "title": fname,
                "file_name": fname,
                "storage_key": f"vault/{fname}",
                "extracted_summary": "Verified",
                "extracted_facts": [],
            },
        )

    # Curate application (currently missing bank_statement)
    curated = client.post(
        f"/v1/students/{student_id}/applications/nlng-e2e-2026-2027/curate"
    ).json()
    app_id = curated["application"]["id"]
    assert curated["application"]["status"] == "waiting_for_requirements"

    # Now Mono/Okra on-request bank statement pull is permitted and satisfies the missing slot!
    pulled = client.post(f"/v1/students/{student_id}/bank-statement/pull", json={})
    assert pulled.status_code == 200
    assert pulled.json()["doc_type"] == "bank_statement"

    apps = client.get(f"/v1/students/{student_id}/applications").json()
    assert apps[0]["status"] == "ready_for_review"
    return student_id, app_id


def test_writing_studio_canvas_zero_fabrication_submission_kits_and_declare_submit(session):
    client = TestClient(app)
    student_id, app_id = _setup_ready_application(session, client)

    # 1. Populate Evidence Ledger (projects, academic standing, community roots)
    for cat, title, fact_text in (
        (
            "academic",
            "100L CGPA & Top 5% Standing",
            "Achieved a 4.21 CGPA (top 5% in 100L Electrical Engineering) and 308/400 in JAMB",
        ),
        (
            "project",
            "Low-Loss Transformer Winding Prototype",
            "Built a low-loss distribution transformer winding prototype in the UNN power lab",
        ),
        (
            "family_sponsorship",
            "Family & Community Context",
            "Raised in Njikoka, Anambra by a civil-servant mother after father passed away in 2021",
        ),
    ):
        res = client.post(
            f"/v1/students/{student_id}/evidence-ledger",
            json={
                "category": cat,
                "title": title,
                "fact_text": fact_text,
                "source_detail": "Onboarding AI Interview",
            },
        )
        assert res.status_code == 200

    # 2. Build Package with grounded essay and dynamic HOD endorsement request letter
    pkg_res = client.post(
        f"/v1/applications/{app_id}/package",
        json={
            "signer_role": SignerRole.HOD.value,
            "recipient_address": "Department of Electrical Engineering, UNN",
        },
    )
    assert pkg_res.status_code == 200
    pkg1 = pkg_res.json()
    assert pkg1["version"] == 1
    assert "REQUEST FOR OFFICIAL ENDORSEMENT LETTER" in pkg1["endorsement_letter"]
    essay_item = next(i for i in pkg1["ordered_items"] if i["kind"] == "essay")
    assert "4.21" in essay_item["draft_text"]

    # 3. Zero-Fabrication Gate blocks ungrounded claims in Gemini Canvas (Unsupported-claim rate = 0)
    fabricated = client.post(
        f"/v1/applications/{app_id}/canvas-rewrite",
        json={
            "prompt_id": "essay-1",
            "replacement_text": "I hold First Class honours with a 4.92 CGPA in Electrical Engineering.",
        },
    )
    assert fabricated.status_code == 422
    assert "4.92" in fabricated.json()["detail"]

    # 4. Grounded Gemini Canvas rewrite succeeds and increments package version + hash
    refined = client.post(
        f"/v1/applications/{app_id}/canvas-rewrite",
        json={
            "prompt_id": "essay-1",
            "instruction": "Highlight lab project",
        },
    )
    assert refined.status_code == 200
    pkg2 = refined.json()
    assert pkg2["version"] == 2
    assert pkg2["package_hash"] != pkg1["package_hash"]

    # 5. Downloadable .DOCX and .PDF Submission Kits are valid
    docx_res = client.get(f"/v1/applications/{app_id}/submission-kit/docx")
    assert docx_res.status_code == 200
    with zipfile.ZipFile(io.BytesIO(docx_res.content)) as zf:
        doc_xml = zf.read("word/document.xml").decode("utf-8")
        assert "Chisom Kamsiyochukwu Okafor" in doc_xml
        assert pkg2["package_hash"] in doc_xml

    pdf_res = client.get(f"/v1/applications/{app_id}/submission-kit/pdf")
    assert pdf_res.status_code == 200
    assert pdf_res.content.startswith(b"%PDF-1.4")

    # 6. Declare & Submit with stale package_hash (pkg1) is rejected with 409 Conflict
    stale_sub = client.post(
        f"/v1/applications/{app_id}/declare-and-submit",
        json={
            "package_hash": pkg1["package_hash"],
            "declaration_text": "I hereby declare that all information is true.",
            "inbox": [],
        },
    )
    assert stale_sub.status_code == 409

    # 7. Declare & Submit with current package_hash picks up portal OTP (ignoring personal email)
    sub_res = client.post(
        f"/v1/applications/{app_id}/declare-and-submit",
        json={
            "package_hash": pkg2["package_hash"],
            "declaration_text": "I hereby declare that all information is true.",
            "inbox": [
                {
                    "message_id": "msg-personal",
                    "sender_email": "friend@gmail.com",
                    "subject": "Your verification code is 999999",
                    "body_text": "Unrelated personal email OTP: 999999",
                },
                {
                    "message_id": "msg-nlng-otp",
                    "sender_email": "no-reply@portal.nlng.com",
                    "subject": "NLNG Portal Verification Code",
                    "body_text": "Your verification code is: 482910",
                },
            ],
        },
    )
    assert sub_res.status_code == 200
    sub_data = sub_res.json()
    assert sub_data["status"] == "submitted"
    assert sub_data["otp_used"] == "482910"
    assert sub_data["receipt_vault_doc_id"] is not None

    # Official confirmation receipt was archived into the student's Dynamic Vault
    vault_docs = client.get(f"/v1/students/{student_id}/vault").json()
    assert any("Official Submission Receipt" in d["title"] for d in vault_docs)


def test_ambiguous_submit_verify_before_retry_drill_prevents_duplicate_submission(session):
    client = TestClient(app)
    student_id, app_id = _setup_ready_application(session, client)
    pkg = submission.build_or_update_package(session, uuid.UUID(app_id))

    driver_calls = 0

    def flaky_portal_driver(portal_url: str, ordered_items: list[dict], otp: str | None) -> str:
        nonlocal driver_calls
        driver_calls += 1
        raise submission.AmbiguousSubmissionError("connection reset after clicking submit")

    # Scoped Gmail inbox already received the official confirmation receipt from the first click!
    inbox = [
        GmailMessage(
            message_id="msg-rcpt-1",
            sender_email="Confirmations@nlng.com",
            subject="Application Submitted Successfully",
            body_text="Your scholarship application was received. Confirmation No: NLNG-2026-88412",
            received_at=NOW,
        )
    ]

    result = submission.declare_and_submit(
        session,
        uuid.UUID(app_id),
        submission.DeclareAndSubmitIn(
            package_hash=pkg.package_hash,
            declaration_text="I hereby declare that all information is true.",
        ),
        inbox=inbox,
        portal_driver=flaky_portal_driver,
    )

    assert driver_calls == 1, "must NOT click submit a second time when Gmail receipt exists"
    assert result.attempts == 1
    assert result.status == "submitted"
    assert result.portal_reference == "NLNG-2026-88412"

    # Phase 6 WhatsApp notification dispatcher telemetry
    dispatcher = NotificationDispatcher()
    evt = dispatcher.send_whatsapp(
        student_id,
        "submission_confirmed",
        f"Submitted with receipt {result.portal_reference}",
    )
    assert evt.channel == "whatsapp" and len(dispatcher.events) == 1
