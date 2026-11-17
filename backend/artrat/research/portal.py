"""Safe dry-run Portal Inspector (docs/04 §2.3, docs/05 §2).

Maps a scholarship portal's fields, separate upload slots (never merging School Admission Letter
and JAMB Admission Letter), essay prompts, declarations, auth steps, and automation policy before
any student documents are touched.
"""

import re

from artrat.catalogue.api import (
    AuthStep,
    AutomationPolicy,
    Claim,
    DocumentType,
    EvidenceRef,
    PortalBlueprintDraft,
    PortalEssaySpec,
    PortalFieldSpec,
    PortalUploadSpec,
    SignerRole,
    SourceSnapshotOut,
    Verification,
)
from artrat.research.extract import WORD_LIMIT_RE, sanitize_snapshot_text

AUTOMATION_BAN_RE = re.compile(
    r"\b(automated\s+submissions?\s+(?:are\s+)?(?:prohibited|forbidden|banned)|"
    r"no\s+bots?\s+or\s+automated\s+scripts?)\b",
    re.IGNORECASE,
)


def inspect_portal_snapshot(
    opportunity_slug: str,
    source: SourceSnapshotOut,
) -> PortalBlueprintDraft:
    """Build a PortalBlueprintDraft from a retrieved portal snapshot."""
    clean_text, _ = sanitize_snapshot_text(source.snapshot_text)
    lines = [ln.strip() for ln in clean_text.splitlines() if ln.strip()]

    fields: list[PortalFieldSpec] = []
    uploads: list[PortalUploadSpec] = []
    essays: list[PortalEssaySpec] = []
    declarations: list[str] = []
    auth_steps: list[AuthStep] = []
    seen_uploads: set[str] = set()

    def add_upload(
        name: str,
        label: str,
        doc_type: DocumentType,
        *,
        signed_by: SignerRole | None = None,
    ) -> None:
        if name not in seen_uploads:
            seen_uploads.add(name)
            uploads.append(
                PortalUploadSpec(
                    name=name, label=label, doc_type=doc_type, signed_by=signed_by
                )
            )

    ban_line: str | None = None

    for ln in lines:
        low = ln.lower()
        if ban_line is None and AUTOMATION_BAN_RE.search(ln):
            ban_line = ln

        if ("full name" in low or "applicant name" in low) and not any(
            f.name == "full_name" for f in fields
        ):
            fields.append(PortalFieldSpec(name="full_name", label="Full Name"))
        if ("matric" in low or "registration number" in low) and not any(
            f.name == "matric_number" for f in fields
        ):
            fields.append(PortalFieldSpec(name="matric_number", label="Matriculation Number"))
        if "cgpa" in low and not any(f.name == "cgpa" for f in fields):
            fields.append(
                PortalFieldSpec(name="cgpa", label="Current CGPA", field_type="number")
            )

        # Separate School Admission Letter vs JAMB Admission Letter (Non-negotiable #3)
        if ("university admission letter" in low or "school admission letter" in low) and (
            "jamb" not in low
        ):
            add_upload(
                "school_admission_letter",
                "University Admission Letter (From School)",
                DocumentType.SCHOOL_ADMISSION_LETTER,
            )
        if "jamb admission letter" in low or "jamb caps" in low:
            add_upload(
                "jamb_admission_letter",
                "JAMB CAPS Official Admission Letter",
                DocumentType.JAMB_ADMISSION_LETTER,
            )
        if "transcript" in low or "semester result" in low or "statement of result" in low:
            add_upload("transcript", "Academic Transcript / Result Sheet", DocumentType.TRANSCRIPT)
        if "student id" in low or "school id" in low or "departmental id" in low:
            add_upload("school_id", "School / Departmental ID Card", DocumentType.SCHOOL_ID)
        if "nin" in low or "national identification" in low:
            add_upload("nin_slip", "National Identification Number (NIN) Slip", DocumentType.NIN_SLIP)
        if "passport photo" in low or "passport photograph" in low:
            add_upload("passport_photo", "Passport Photograph", DocumentType.PASSPORT_PHOTO)
        if "o'level" in low or "waec" in low or "neco" in low:
            add_upload("waec_result", "O'Level (WAEC/NECO) Result", DocumentType.WAEC_RESULT)
        if "jamb result" in low or "utme result" in low:
            add_upload("jamb_result", "JAMB UTME Result Slip", DocumentType.JAMB_RESULT)
        if "lga" in low and ("certificate" in low or "origin" in low or "indigene" in low):
            add_upload(
                "lga_certificate", "LGA Certificate of Origin", DocumentType.LGA_CERTIFICATE
            )
        if "bank statement" in low:
            add_upload("bank_statement", "Bank Statement", DocumentType.BANK_STATEMENT)

        for phrase, role, label in (
            ("hod", SignerRole.HOD, "HOD Attestation / Endorsement Letter"),
            ("head of department", SignerRole.HOD, "HOD Attestation / Endorsement Letter"),
            ("academic referee", SignerRole.ACADEMIC_REFEREE, "Academic Referee Letter"),
            ("mentor", SignerRole.MENTOR, "Mentor Recommendation Letter"),
            ("guarantor", SignerRole.GUARANTOR, "Guarantor Endorsement Form"),
            ("clergy", SignerRole.CLERGY, "Clergy Attestation Letter"),
        ):
            if phrase in low and any(w in low for w in ("letter", "endorsement", "reference", "attestation")):
                add_upload(
                    f"endorsement_{role.value}",
                    label,
                    DocumentType.DYNAMIC_ENDORSEMENT,
                    signed_by=role,
                )
                break

        if "personal statement" in low or "statement of purpose" in low or "essay prompt" in low:
            m = WORD_LIMIT_RE.search(ln)
            limit = int(m.group(1)) if m else None
            essays.append(
                PortalEssaySpec(
                    prompt_id=f"essay-{len(essays) + 1}",
                    prompt=ln,
                    word_limit=limit,
                )
            )

        if low.startswith(("i hereby declare", "i certify that", "declaration:")):
            declarations.append(ln)

        if ("otp" in low or "verification code" in low) and AuthStep.EMAIL_OTP not in auth_steps:
            auth_steps.append(AuthStep.EMAIL_OTP)
        if (
            "sign in" in low or "log in" in low or "portal login" in low
        ) and AuthStep.LOGIN not in auth_steps:
            auth_steps.append(AuthStep.LOGIN)

    anchor_passage = ban_line or (lines[0] if lines else "")
    if anchor_passage:
        policy_val = (
            AutomationPolicy.EXPLICITLY_BANNED if ban_line else AutomationPolicy.PERMITTED
        )
        policy_claim = Claim[AutomationPolicy](
            value=policy_val,
            verification=Verification.OFFICIAL,
            evidence=(
                EvidenceRef(
                    source_id=str(source.id),
                    url=source.final_url,
                    passage=anchor_passage,
                    retrieved_at=source.retrieved_at,
                ),
            ),
            last_verified_at=source.retrieved_at,
        )
    else:
        policy_claim = Claim[AutomationPolicy].unknown(source.retrieved_at)

    return PortalBlueprintDraft(
        opportunity_slug=opportunity_slug,
        portal_url=source.final_url,
        fields=tuple(fields),
        uploads=tuple(uploads),
        essay_prompts=tuple(essays),
        declarations=tuple(declarations),
        auth_steps=tuple(auth_steps),
        automation_policy=policy_claim,
    )
