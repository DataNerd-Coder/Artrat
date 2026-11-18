"""Extract structured Opportunities and Requirements from a stored Source snapshot (docs/05 §2, §5).

Guardrails enforced here:
1. Prompt injection: lines containing instruction-override patterns are stripped before extraction
   and reported in `flagged_injections` so injected text can never be cited as evidence.
2. Verbatim evidence: every Claim passage must match the sanitized snapshot text, or the claim is
   downgraded to `unknown` (and a candidate without a grounded title is rejected).
3. Separate admission letters: School Admission Letter and JAMB Admission Letter are distinct
   DocumentRequirement items and are never merged (Non-negotiable #3).
"""

import re
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime

from pydantic import BaseModel

from artrat.catalogue import api as catalogue
from artrat.catalogue.api import (
    Claim,
    CriterionKey,
    CriterionRequirement,
    DocumentRequirement,
    DocumentType,
    EssayRequirement,
    EvidenceRef,
    OpportunityDraft,
    Requirement,
    SignerRole,
    SourceSnapshotOut,
    Verification,
    passage_in_snapshot,
)

INJECTION_PATTERNS = (
    re.compile(r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions", re.IGNORECASE),
    re.compile(r"disregard\s+(all\s+)?(previous|prior|above)", re.IGNORECASE),
    re.compile(r"system\s+prompt\s*:", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+a", re.IGNORECASE),
    re.compile(r"do\s+not\s+verify\s+evidence", re.IGNORECASE),
)

CYCLE_RE = re.compile(r"\b(20\d{2}\s*/\s*20\d{2}|20\d{2})\b")
SCHOLARSHIP_HEADING_RE = re.compile(
    r"\b(scholarship|bursary|fellowship|grant|studentship|award)\b", re.IGNORECASE
)
DATE_TOKEN_PAT = (
    r"(?:\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+\s+20\d{2}"
    r"|[A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+20\d{2}"
    r"|20\d{2}-\d{2}-\d{2})"
)
DEADLINE_RE = re.compile(
    r"(?:deadline|closes?\s+on|closing\s+date|apply\s+before|complete\s+your\s+application\s+by"
    r"|submissions?\s+close(?:\s+on)?)"
    rf"[:\s—–-]*({DATE_TOKEN_PAT})",
    re.IGNORECASE,
)
STANDALONE_DATE_RE = re.compile(rf"\b({DATE_TOKEN_PAT})\b", re.IGNORECASE)
DEADLINE_HEADING_RE = re.compile(
    r"^(?:application\s+deadline|deadline(?:\s+stated\s+in\s+the\s+article)?|closing\s+date"
    r"|important\s+dates?\s+and\s+deadline)\s*:?\s*$",
    re.IGNORECASE,
)
PORTAL_URL_RE = re.compile(
    r"(?:apply\s+(?:at|online\s+at|via)|application\s+portal\s*:?)\s*"
    r"(https?://[^\s,;)>\"]+|(?:portal|apply)\.[a-z0-9.-]+\.[a-z]{2,}(?:/[^\s,;)>\"]*)?)",
    re.IGNORECASE,
)
WORD_LIMIT_RE = re.compile(r"(\d{2,4})\s*(?:-|\s+)?words?", re.IGNORECASE)

MONTHS = {
    "january": 1, "jan": 1, "february": 2, "feb": 2, "march": 3, "mar": 3,
    "april": 4, "apr": 4, "may": 5, "june": 6, "jun": 6, "july": 7, "jul": 7,
    "august": 8, "aug": 8, "september": 9, "sep": 9, "sept": 9,
    "october": 10, "oct": 10, "november": 11, "nov": 11, "december": 12, "dec": 12,
}


class ProposedClaim[T](BaseModel):
    value: T | None = None
    passage: str | None = None


class ProposedOpportunity(BaseModel):
    slug: str
    cycle: str
    title: ProposedClaim[str]
    official_url: ProposedClaim[str] = ProposedClaim()
    application_url: ProposedClaim[str] = ProposedClaim()
    deadline: ProposedClaim[datetime] = ProposedClaim()
    requirements: tuple[Requirement, ...] = ()


@dataclass(frozen=True)
class ExtractionOutcome:
    drafts: list[OpportunityDraft] = field(default_factory=list)
    flagged_injections: list[str] = field(default_factory=list)


def sanitize_snapshot_text(text: str) -> tuple[str, list[str]]:
    """Remove lines containing prompt-injection directives and return (clean_text, flagged_lines)."""
    clean_lines: list[str] = []
    flagged: list[str] = []
    for line in text.splitlines():
        if any(p.search(line) for p in INJECTION_PATTERNS):
            flagged.append(line.strip()[:200])
        else:
            clean_lines.append(line)
    return "\n".join(clean_lines), flagged


def _slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug[:180] or "opportunity"


def _parse_date(raw: str) -> datetime | None:
    raw = raw.strip().rstrip(".")
    if re.match(r"^20\d{2}-\d{2}-\d{2}$", raw):
        y, m, d = (int(x) for x in raw.split("-"))
        return datetime(y, m, d, 23, 59, tzinfo=UTC)
    cleaned = re.sub(r"(\d{1,2})(?:st|nd|rd|th)\b", r"\1", raw, flags=re.IGNORECASE)
    cleaned = cleaned.replace(",", " ")
    parts = cleaned.split()
    if len(parts) == 3:
        # Format 1: DD Month YYYY
        if parts[0].isdigit() and parts[2].isdigit():
            month = MONTHS.get(parts[1].lower())
            if month and 1 <= int(parts[0]) <= 31:
                return datetime(int(parts[2]), month, int(parts[0]), 23, 59, tzinfo=UTC)
        # Format 2: Month DD YYYY
        if parts[1].isdigit() and parts[2].isdigit():
            month = MONTHS.get(parts[0].lower())
            if month and 1 <= int(parts[1]) <= 31:
                return datetime(int(parts[2]), month, int(parts[1]), 23, 59, tzinfo=UTC)
    return None


def _claim_from_passage[T](
    value: T | None,
    passage: str | None,
    source: SourceSnapshotOut,
    clean_text: str,
    verification: Verification = Verification.OFFICIAL,
) -> Claim[T]:
    if value is None or not passage or not passage_in_snapshot(passage, clean_text):
        return Claim[T].unknown(source.retrieved_at)
    return Claim[T](
        value=value,
        verification=verification,
        evidence=(
            EvidenceRef(
                source_id=str(source.id),
                url=source.final_url,
                passage=passage.strip(),
                retrieved_at=source.retrieved_at,
            ),
        ),
        last_verified_at=source.retrieved_at,
    )


def _extract_requirements(clean_text: str, source: SourceSnapshotOut) -> tuple[Requirement, ...]:
    reqs: list[Requirement] = []
    for raw_line in clean_text.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        low = line.lower()
        claim = _claim_from_passage(line, line, source, clean_text)
        if claim.verification is Verification.UNKNOWN:
            continue

        # Hard academic / identity rules
        if "cgpa" in low or "first class" in low or "second class" in low:
            reqs.append(
                CriterionRequirement(key=CriterionKey.CGPA, rule=line, hard=True, claim=claim)
            )
        if "orphan" in low or "fatherless" in low or "deceased parent" in low:
            reqs.append(
                CriterionRequirement(
                    key=CriterionKey.ORPHAN_OR_FATHERLESS, rule=line, hard=True, claim=claim
                )
            )
        if "disability" in low or "visually impaired" in low or "physically challenged" in low:
            reqs.append(
                CriterionRequirement(
                    key=CriterionKey.DISABILITY, rule=line, hard=True, claim=claim
                )
            )

        # Separate School Admission Letter vs JAMB Admission Letter (Non-negotiable #3)
        if ("university admission letter" in low or "school admission letter" in low) and (
            "jamb" not in low
        ):
            reqs.append(
                DocumentRequirement(
                    doc_type=DocumentType.SCHOOL_ADMISSION_LETTER, claim=claim
                )
            )
        if "jamb admission letter" in low or "jamb caps" in low:
            reqs.append(
                DocumentRequirement(
                    doc_type=DocumentType.JAMB_ADMISSION_LETTER, claim=claim
                )
            )

        # Dynamic endorsements (never hardcoded to one signer role)
        for phrase, role in (
            ("hod", SignerRole.HOD),
            ("head of department", SignerRole.HOD),
            ("academic referee", SignerRole.ACADEMIC_REFEREE),
            ("mentor", SignerRole.MENTOR),
            ("guarantor", SignerRole.GUARANTOR),
            ("clergy", SignerRole.CLERGY),
            ("dean", SignerRole.DEAN),
        ):
            if phrase in low and any(w in low for w in ("letter", "endorsement", "reference", "attestation")):
                reqs.append(
                    DocumentRequirement(
                        doc_type=DocumentType.DYNAMIC_ENDORSEMENT,
                        signed_by=role,
                        on_request_only=True,
                        claim=claim,
                    )
                )
                break

        if "lga certificate" in low or "certificate of origin" in low:
            reqs.append(
                DocumentRequirement(
                    doc_type=DocumentType.LGA_CERTIFICATE, on_request_only=True, claim=claim
                )
            )
        if "bank statement" in low:
            reqs.append(
                DocumentRequirement(
                    doc_type=DocumentType.BANK_STATEMENT, on_request_only=True, claim=claim
                )
            )
        if "personal statement" in low or "essay" in low or "statement of purpose" in low:
            m = WORD_LIMIT_RE.search(line)
            limit = int(m.group(1)) if m else None
            reqs.append(
                EssayRequirement(prompt_id="essay-1", word_limit=limit, claim=claim)
            )
    return tuple(reqs)


def default_propose(source: SourceSnapshotOut, clean_text: str) -> list[ProposedOpportunity]:
    """Structured heuristic proposal over sanitized page text.

    A page yields a ProposedOpportunity only when it states both a scholarship heading line and
    at least one actionable fact (a deadline or an application portal URL).
    """
    lines = [ln.strip() for ln in clean_text.splitlines() if ln.strip()]
    if not lines:
        return []

    heading_candidates = [ln for ln in lines[:30] if SCHOLARSHIP_HEADING_RE.search(ln)]
    if not heading_candidates:
        return []
    heading_line = next(
        (ln for ln in heading_candidates if CYCLE_RE.search(ln)),
        heading_candidates[0],
    )

    deadline_val: datetime | None = None
    deadline_passage: str | None = None
    app_url_val: str | None = None
    app_url_passage: str | None = None

    for idx, ln in enumerate(lines):
        if deadline_val is None and (m := DEADLINE_RE.search(ln)):
            parsed = _parse_date(m.group(1))
            if parsed is not None:
                deadline_val = parsed
                deadline_passage = ln
        if deadline_val is None and DEADLINE_HEADING_RE.match(ln):
            for nxt in lines[idx + 1 : idx + 4]:
                for dm in STANDALONE_DATE_RE.finditer(nxt):
                    parsed = _parse_date(dm.group(1))
                    if parsed is not None:
                        deadline_val = parsed
                        deadline_passage = nxt
                        break
                if deadline_val is not None:
                    break
        if app_url_val is None and (m := PORTAL_URL_RE.search(ln)):
            raw_url = m.group(1).rstrip(".")
            if not raw_url.startswith(("http://", "https://")):
                raw_url = f"https://{raw_url}"
            app_url_val = raw_url
            app_url_passage = ln

    if deadline_val is None and app_url_val is None:
        return []

    if app_url_val is None:
        app_url_val = source.final_url
        app_url_passage = heading_line

    cycle_match = CYCLE_RE.search(heading_line) or CYCLE_RE.search(clean_text)
    cycle = cycle_match.group(1).replace(" ", "") if cycle_match else str(source.retrieved_at.year)
    clean_title = CYCLE_RE.sub("", heading_line).strip(" -–—:|") or heading_line
    slug = _slugify(f"{clean_title}-{cycle.replace('/', '-')}")

    return [
        ProposedOpportunity(
            slug=slug,
            cycle=cycle,
            title=ProposedClaim(value=clean_title, passage=heading_line),
            official_url=ProposedClaim(value=source.final_url, passage=heading_line),
            application_url=ProposedClaim(value=app_url_val, passage=app_url_passage),
            deadline=ProposedClaim(value=deadline_val, passage=deadline_passage),
            requirements=_extract_requirements(clean_text, source),
        )
    ]


Proposer = Callable[[SourceSnapshotOut, str], list[ProposedOpportunity]]


def materialise_draft(
    proposal: ProposedOpportunity,
    source: SourceSnapshotOut,
    clean_text: str,
) -> OpportunityDraft | None:
    """Turn a ProposedOpportunity into a validated OpportunityDraft.

    Returns None if the title is not grounded in the sanitized snapshot text.
    """
    title_claim = _claim_from_passage(
        proposal.title.value, proposal.title.passage, source, clean_text
    )
    if title_claim.verification is Verification.UNKNOWN:
        return None
    official_claim = _claim_from_passage(
        proposal.official_url.value, proposal.official_url.passage, source, clean_text
    )
    app_claim = _claim_from_passage(
        proposal.application_url.value, proposal.application_url.passage, source, clean_text
    )
    deadline_claim = _claim_from_passage(
        proposal.deadline.value, proposal.deadline.passage, source, clean_text
    )
    valid_reqs = tuple(
        req
        for req in proposal.requirements
        if all(passage_in_snapshot(ev.passage, clean_text) for ev in req.claim.evidence)
    )
    return catalogue.OpportunityDraft(
        slug=proposal.slug,
        cycle=proposal.cycle,
        title=title_claim,
        official_url=official_claim,
        application_url=app_claim,
        deadline=deadline_claim,
        requirements=valid_reqs,
    )


def extract_from_source(
    source: SourceSnapshotOut,
    proposer: Proposer = default_propose,
) -> ExtractionOutcome:
    clean_text, flagged = sanitize_snapshot_text(source.snapshot_text)
    drafts: list[OpportunityDraft] = []
    for proposal in proposer(source, clean_text):
        draft = materialise_draft(proposal, source, clean_text)
        if draft is not None:
            drafts.append(draft)
    return ExtractionOutcome(drafts=drafts, flagged_injections=flagged)
