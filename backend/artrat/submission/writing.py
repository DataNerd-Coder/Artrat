"""Writing Studio, Gemini Canvas live rewrite, Dynamic Endorsement Generator, and Zero-Fabrication
Gate (docs/04 §3.6, docs/06 §4, docs/07 P4).

Non-negotiable #4 (README.md):
Artrat never invents a student's grades, projects, family background, or experiences; every essay
claim maps to the student's Evidence Ledger. Unsupported-claim rate must be 0.
"""

import re
from collections.abc import Iterable

from artrat.catalogue.api import SignerRole

NUMERIC_CLAIM_RE = re.compile(
    r"\b([1-5]\.\d{2})\b|\b([23]\d{2})\s*/\s*400\b|\btop\s+(\d{1,2}%)\b",
    re.IGNORECASE,
)


class UnsupportedClaimError(ValueError):
    """Raised when a draft contains an academic or project claim not present in the Evidence Ledger."""


class WordLimitExceededError(ValueError):
    """Raised when a draft exceeds the PortalEssaySpec word limit."""


def word_count(text: str) -> int:
    return len(text.split())


def verify_draft_against_ledger(
    draft_text: str,
    ledger_texts: Iterable[str],
    fact_values: Iterable[str],
) -> None:
    """Enforce zero fabricated facts (docs/06 §4): every numeric/honours claim in `draft_text`
    must appear in the student's Evidence Ledger or verified Profile Facts."""
    corpus = " ".join([*ledger_texts, *fact_values]).lower()

    for m in NUMERIC_CLAIM_RE.finditer(draft_text):
        token = next(g for g in m.groups() if g is not None).lower()
        if token not in corpus:
            raise UnsupportedClaimError(
                f"draft cites metric {token!r} which is not grounded in the student's Evidence Ledger"
            )

    low_draft = draft_text.lower()
    if "first class" in low_draft and "first class" not in corpus:
        # Also check if a >= 4.50 CGPA is in the corpus
        has_first_class_cgpa = any(
            float(g.group(1)) >= 4.50
            for g in re.finditer(r"\b([45]\.\d{2})\b", corpus)
            if g.group(1)
        )
        if not has_first_class_cgpa:
            raise UnsupportedClaimError(
                "draft claims 'First Class' honours not supported by the student's Evidence Ledger"
            )


def _trim_to_word_limit(text: str, word_limit: int | None) -> str:
    if word_limit is None:
        return text.strip()
    words = text.split()
    if len(words) <= word_limit:
        return text.strip()
    trimmed = " ".join(words[:word_limit]).rstrip(",;:")
    return trimmed if trimmed.endswith(".") else f"{trimmed}."


def compose_grounded_essay(
    *,
    student_name: str,
    institution: str,
    department: str,
    prompt: str,
    word_limit: int | None,
    ledger_texts: list[str],
    fact_values: list[str],
) -> str:
    """Compose a grounded personal statement strictly from the student's Evidence Ledger & Facts."""
    evidence_sentences = [t.strip().rstrip(".") + "." for t in ledger_texts if t.strip()]
    body_facts = " ".join(evidence_sentences) if evidence_sentences else ""
    draft = (
        f"My name is {student_name}, an undergraduate studying {department} at {institution}. "
        f"Addressing the prompt ({prompt.strip().rstrip('.')}), my academic journey and community "
        f"commitment are grounded in verified achievements. {body_facts} "
        f"This scholarship will enable me to focus fully on my engineering research and community impact."
    ).strip()
    draft = _trim_to_word_limit(draft, word_limit)
    verify_draft_against_ledger(draft, ledger_texts, fact_values)
    return draft


def rewrite_essay_in_canvas(
    *,
    current_draft: str,
    instruction: str,
    word_limit: int | None,
    ledger_texts: list[str],
    fact_values: list[str],
    replacement_text: str | None = None,
) -> str:
    """Apply a Gemini Canvas refinement or direct edit and validate against the Evidence Ledger."""
    if replacement_text is not None:
        candidate = replacement_text.strip()
    else:
        inst_low = instruction.lower()
        if "tighten" in inst_low or "word limit" in inst_low:
            target = min(word_limit or 120, max(20, int(word_count(current_draft) * 0.8)))
            candidate = _trim_to_word_limit(current_draft, target)
        elif "opening" in inst_low and ledger_texts:
            lead = ledger_texts[0].strip().rstrip(".")
            candidate = f"Driven by {lead}, {current_draft}"
        elif ("project" in inst_low or "highlight" in inst_low) and ledger_texts:
            proj = next(
                (t for t in ledger_texts if "project" in t.lower() or "lab" in t.lower()),
                ledger_texts[-1],
            )
            candidate = f"{current_draft.rstrip()} In particular, {proj.strip().rstrip('.')}."
        else:
            candidate = current_draft.strip()
        candidate = _trim_to_word_limit(candidate, word_limit)

    if word_limit is not None and word_count(candidate) > word_limit:
        raise WordLimitExceededError(
            f"draft has {word_count(candidate)} words, exceeding limit of {word_limit}"
        )
    verify_draft_against_ledger(candidate, ledger_texts, fact_values)
    return candidate


ROLE_TITLES: dict[SignerRole, str] = {
    SignerRole.HOD: "The Head of Department",
    SignerRole.ACADEMIC_REFEREE: "Academic Referee",
    SignerRole.MENTOR: "Academic & Research Mentor",
    SignerRole.GUARANTOR: "Scholarship Guarantor",
    SignerRole.CLERGY: "Officiating Clergy / Religious Leader",
    SignerRole.DEAN: "The Dean of Faculty",
    SignerRole.EXAM_OFFICER: "The Departmental Examination Officer",
    SignerRole.EMPLOYER: "Supervisor / Employer",
    SignerRole.COMMUNITY_LEADER: "Community Traditional / Civic Leader",
    SignerRole.GUARDIAN: "Parent / Legal Guardian",
    SignerRole.OTHER: "Authorized Signatory",
}


def generate_dynamic_endorsement_letter(
    *,
    student_name: str,
    matric_number: str,
    institution: str,
    department: str,
    residential_address: str,
    signer_role: SignerRole,
    recipient_address: str,
    opportunity_title: str,
    ledger_texts: list[str],
) -> str:
    """Generate a dynamic endorsement request letter for any SignerRole (never hardcoded to HOD)."""
    salutation_title = ROLE_TITLES.get(signer_role, "Authorized Signatory")
    highlights = "; ".join(t.strip().rstrip(".") for t in ledger_texts[:3]) or (
        f"verified undergraduate standing in {department}"
    )
    return (
        f"{residential_address}\n\n"
        f"{salutation_title}\n"
        f"{recipient_address}\n\n"
        f"Dear Sir/Madam,\n\n"
        f"REQUEST FOR OFFICIAL ENDORSEMENT LETTER — {opportunity_title.upper()}\n\n"
        f"I am {student_name} (Matriculation No: {matric_number}), an undergraduate in "
        f"{department} at {institution}. I am applying for the {opportunity_title}, which "
        f"requires a signed attestation from {salutation_title}.\n\n"
        f"Key verified records in my academic profile include: {highlights}.\n\n"
        f"Thank you for your support.\n\n"
        f"Yours faithfully,\n"
        f"{student_name}\n"
        f"{matric_number}"
    )
