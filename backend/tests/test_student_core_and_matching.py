"""Phase 3 tests: Under-18 NDPA student profile, Vision Vault extraction with separate School &
JAMB Admission Letters, strict binary eligibility gate, PortalBlueprint-ordered Application
curation, and the Google Tasks auto-reopen drill (docs/07 P3 exit gate)."""

from datetime import UTC, date, datetime

from fastapi.testclient import TestClient

from artrat.api.app import app
from artrat.catalogue import api as catalogue
from artrat.catalogue.api import (
    AutomationPolicy,
    Claim,
    CriterionKey,
    CriterionRequirement,
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
from artrat.student.api import (
    ApplicationStatus,
    FactOrigin,
    ProfileFactIn,
    StudentTaskStatus,
)

NOW = datetime(2026, 11, 17, tzinfo=UTC)


def _seed_opportunities(session):
    text = (
        "NLNG Undergraduate Scholarship 2026/2027\n"
        "Applications close on 30 June 2027.\n"
        "Apply at https://portal.nlng.com/apply\n"
        "Eligibility: Minimum CGPA of 3.50 in 200 Level.\n"
        "Shell First Class Award 2026/2027\n"
        "Eligibility: First Class Honours with minimum CGPA of 4.50.\n"
    )
    src = catalogue.store_snapshot(
        session,
        SnapshotIn(
            url="https://nlng.com/scholarship",
            final_url="https://nlng.com/scholarship",
            status_code=200,
            fetch_mode=FetchMode.STATIC,
            title="Scholarships",
            text=text,
            retrieved_at=NOW,
        ),
    )

    def ev(passage: str):
        return (
            EvidenceRef(
                source_id=str(src.id),
                url=src.final_url,
                passage=passage,
                retrieved_at=NOW,
            ),
        )

    # 1. NLNG (requires 3.50 CGPA -> Chisom with 4.21 qualifies)
    catalogue.record_opportunity(
        session,
        OpportunityDraft(
            slug="nlng-undergrad-2026-2027",
            cycle="2026/2027",
            title=Claim[str](
                value="NLNG Undergraduate Scholarship",
                verification=Verification.OFFICIAL,
                evidence=ev("NLNG Undergraduate Scholarship 2026/2027"),
                last_verified_at=NOW,
            ),
            official_url=Claim[str](
                value="https://nlng.com/scholarship",
                verification=Verification.OFFICIAL,
                evidence=ev("NLNG Undergraduate Scholarship 2026/2027"),
                last_verified_at=NOW,
            ),
            application_url=Claim[str](
                value="https://portal.nlng.com/apply",
                verification=Verification.OFFICIAL,
                evidence=ev("Apply at https://portal.nlng.com/apply"),
                last_verified_at=NOW,
            ),
            deadline=Claim[datetime](
                value=datetime(2027, 6, 30, 23, 59, tzinfo=UTC),
                verification=Verification.OFFICIAL,
                evidence=ev("Applications close on 30 June 2027."),
                last_verified_at=NOW,
            ),
            requirements=(
                CriterionRequirement(
                    key=CriterionKey.CGPA,
                    rule="Eligibility: Minimum CGPA of 3.50 in 200 Level.",
                    hard=True,
                    claim=Claim[str](
                        value="Eligibility: Minimum CGPA of 3.50 in 200 Level.",
                        verification=Verification.OFFICIAL,
                        evidence=ev("Eligibility: Minimum CGPA of 3.50 in 200 Level."),
                        last_verified_at=NOW,
                    ),
                ),
            ),
        ),
    )
    catalogue.record_portal_blueprint(
        session,
        PortalBlueprintDraft(
            opportunity_slug="nlng-undergrad-2026-2027",
            portal_url="https://portal.nlng.com/apply",
            fields=(
                PortalFieldSpec(name="full_name", label="Full Name"),
                PortalFieldSpec(name="matric_number", label="Matriculation Number"),
                PortalFieldSpec(name="cgpa", label="Current CGPA", field_type="number"),
            ),
            uploads=(
                PortalUploadSpec(
                    name="school_admission_letter",
                    label="University Admission Letter (From School)",
                    doc_type=DocumentType.SCHOOL_ADMISSION_LETTER,
                ),
                PortalUploadSpec(
                    name="jamb_admission_letter",
                    label="JAMB CAPS Official Admission Letter",
                    doc_type=DocumentType.JAMB_ADMISSION_LETTER,
                ),
                PortalUploadSpec(
                    name="transcript",
                    label="Academic Transcript / Statement of Result",
                    doc_type=DocumentType.TRANSCRIPT,
                ),
                PortalUploadSpec(
                    name="endorsement_hod",
                    label="HOD Attestation Letter",
                    doc_type=DocumentType.DYNAMIC_ENDORSEMENT,
                    signed_by=SignerRole.HOD,
                ),
            ),
            essay_prompts=(
                PortalEssaySpec(
                    prompt_id="essay-1",
                    prompt="Personal statement on engineering impact",
                    word_limit=500,
                ),
            ),
            declarations=("I hereby declare that all submitted documents are authentic.",),
            automation_policy=Claim[AutomationPolicy](
                value=AutomationPolicy.PERMITTED,
                verification=Verification.OFFICIAL,
                evidence=ev("NLNG Undergraduate Scholarship 2026/2027"),
                last_verified_at=NOW,
            ),
        ),
    )

    # 2. Shell First Class Award (requires 4.50 CGPA -> Chisom with 4.21 fails binary gate)
    catalogue.record_opportunity(
        session,
        OpportunityDraft(
            slug="shell-first-class-2026-2027",
            cycle="2026/2027",
            title=Claim[str](
                value="Shell First Class Award",
                verification=Verification.OFFICIAL,
                evidence=ev("Shell First Class Award 2026/2027"),
                last_verified_at=NOW,
            ),
            official_url=Claim[str].unknown(NOW),
            application_url=Claim[str](
                value="https://portal.nlng.com/apply",
                verification=Verification.OFFICIAL,
                evidence=ev("Apply at https://portal.nlng.com/apply"),
                last_verified_at=NOW,
            ),
            deadline=Claim[datetime](
                value=datetime(2027, 6, 30, 23, 59, tzinfo=UTC),
                verification=Verification.OFFICIAL,
                evidence=ev("Applications close on 30 June 2027."),
                last_verified_at=NOW,
            ),
            requirements=(
                CriterionRequirement(
                    key=CriterionKey.CGPA,
                    rule="Eligibility: First Class Honours with minimum CGPA of 4.50.",
                    hard=True,
                    claim=Claim[str](
                        value="Eligibility: First Class Honours with minimum CGPA of 4.50.",
                        verification=Verification.OFFICIAL,
                        evidence=ev("Eligibility: First Class Honours with minimum CGPA of 4.50."),
                        last_verified_at=NOW,
                    ),
                ),
            ),
        ),
    )
    catalogue.record_portal_blueprint(
        session,
        PortalBlueprintDraft(
            opportunity_slug="shell-first-class-2026-2027",
            portal_url="https://portal.nlng.com/apply",
            automation_policy=Claim[AutomationPolicy](
                value=AutomationPolicy.PERMITTED,
                verification=Verification.OFFICIAL,
                evidence=ev("Shell First Class Award 2026/2027"),
                last_verified_at=NOW,
            ),
        ),
    )
    session.commit()


def test_student_onboarding_vision_vault_binary_matching_and_google_tasks_reopen_loop(session):
    _seed_opportunities(session)
    client = TestClient(app)

    # 1. Create under-18 student profile (born 14 May 2009 -> 17 years old in Nov 2026 -> is_minor=True)
    stu_res = client.post(
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
    )
    assert stu_res.status_code == 200
    student_data = stu_res.json()
    student_id = student_data["id"]
    assert student_data["is_minor"] is True
    assert student_data["autonomous_level_promotion"] is True

    # 2. Upload separate School Admission Letter, JAMB Admission Letter, and Transcript (Vision extracts CGPA)
    for upload_payload in (
        {
            "doc_type": DocumentType.SCHOOL_ADMISSION_LETTER.value,
            "title": "University Admission Letter (From School)",
            "file_name": "UNN_Admission_Letter_Chisom.pdf",
            "storage_key": "vault/unn-admission.pdf",
            "extracted_summary": "UNN Faculty of Engineering · Electrical Engineering",
            "extracted_facts": [],
        },
        {
            "doc_type": DocumentType.JAMB_ADMISSION_LETTER.value,
            "title": "JAMB CAPS Official Admission Letter",
            "file_name": "JAMB_CAPS_Admission_Letter_Chisom.pdf",
            "storage_key": "vault/jamb-admission.pdf",
            "extracted_summary": "JAMB CAPS Reference 2024981234AB",
            "extracted_facts": [],
        },
        {
            "doc_type": DocumentType.TRANSCRIPT.value,
            "title": "Exam Officer Compiled Semester Result Sheet",
            "file_name": "UNN_100L_Result_Sheet_Signed.pdf",
            "storage_key": "vault/transcript.pdf",
            "extracted_summary": "CGPA 4.21 / 5.00 verified from Exam Officer sheet",
            "extracted_facts": [
                ProfileFactIn(
                    key="cgpa",
                    label="Current CGPA",
                    value="4.21 / 5.00",
                    source_detail="Vision OCR from Exam Officer Result Sheet",
                ).model_dump(mode="json")
            ],
        },
    ):
        res = client.post(f"/v1/students/{student_id}/vault", json=upload_payload)
        assert res.status_code == 200

    vault_docs = client.get(f"/v1/students/{student_id}/vault").json()
    assert {d["doc_type"] for d in vault_docs} == {
        "school_admission_letter",
        "jamb_admission_letter",
        "transcript",
    }

    facts = client.get(f"/v1/students/{student_id}/facts").json()
    assert len(facts) == 1
    assert facts[0]["key"] == "cgpa"
    assert facts[0]["origin"] == FactOrigin.DOCUMENT_EXTRACTED.value

    # 3. Binary eligibility gate rejects First Class scholarship (4.21 < 4.50)
    rejected = client.post(
        f"/v1/students/{student_id}/applications/shell-first-class-2026-2027/curate"
    ).json()
    assert rejected["eligible"] is False
    assert any("4.50" in r for r in rejected["failed_hard_rules"])
    assert rejected["application"] is None

    # 4. Binary eligibility gate accepts NLNG (4.21 >= 3.50) and prepares items in PortalBlueprint order
    curated = client.post(
        f"/v1/students/{student_id}/applications/nlng-undergrad-2026-2027/curate"
    ).json()
    assert curated["eligible"] is True
    app_data = curated["application"]
    assert app_data["status"] == ApplicationStatus.WAITING_FOR_REQUIREMENTS.value
    assert [i["sequence"] for i in app_data["ordered_items"]] == [1, 2, 3, 4, 5, 6, 7, 8]

    # School Admission Letter (seq 4), JAMB Admission Letter (seq 5), and Transcript (seq 6) are ready;
    # only HOD Endorsement (seq 7) is missing!
    by_name = {i.get("name") or i.get("prompt_id"): i for i in app_data["ordered_items"]}
    assert by_name["school_admission_letter"]["status"] == "ready"
    assert by_name["jamb_admission_letter"]["status"] == "ready"
    assert by_name["transcript"]["status"] == "ready"
    assert by_name["endorsement_hod"]["status"] == "missing"

    # 5. Missing HOD endorsement created 1 persistent Task with Google Task & Calendar IDs
    tasks = client.get(f"/v1/students/{student_id}/tasks").json()
    assert len(tasks) == 1
    task = tasks[0]
    assert task["status"] == StudentTaskStatus.OPEN.value
    assert task["manual_completion_allowed"] is False
    assert task["google_task_id"].startswith("gtask-")
    assert task["google_calendar_event_id"].startswith("gcal-")

    # 6. External Google Tasks check-off WITHOUT uploading document auto-reopens the task!
    reopened = client.post(f"/v1/tasks/{task['id']}/google-tasks-webhook").json()
    assert reopened["status"] == StudentTaskStatus.OPEN.value
    assert reopened["sync_status"] == "reopened_in_google_tasks"

    # 7. Uploading the signed HOD letter to Vault globally satisfies the Application and closes the Task!
    hod_upload = client.post(
        f"/v1/students/{student_id}/vault",
        json={
            "doc_type": DocumentType.DYNAMIC_ENDORSEMENT.value,
            "signed_by": SignerRole.HOD.value,
            "title": "Signed HOD Attestation Letter",
            "file_name": "UNN_EEE_HOD_Endorsement_Signed.pdf",
            "storage_key": "vault/hod-endorsement.pdf",
            "extracted_summary": "Signed & stamped by HOD Electrical Engineering, UNN",
            "extracted_facts": [],
        },
    )
    assert hod_upload.status_code == 200

    updated_apps = client.get(f"/v1/students/{student_id}/applications").json()
    assert len(updated_apps) == 1
    assert updated_apps[0]["status"] == ApplicationStatus.READY_FOR_REVIEW.value
    assert all(i["status"] == "ready" for i in updated_apps[0]["ordered_items"])

    updated_tasks = client.get(f"/v1/students/{student_id}/tasks").json()
    assert updated_tasks[0]["status"] == StudentTaskStatus.SATISFIED.value

    # 8. Manual level force-override in Settings disables autonomous level promotion
    overridden = client.post(
        f"/v1/students/{student_id}/level-override",
        json={"academic_level": "300 Level"},
    ).json()
    assert overridden["academic_level"] == "300 Level"
    assert overridden["autonomous_level_promotion"] is False
