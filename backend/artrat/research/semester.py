"""Live University Semester Checker (docs/04 §2.5, docs/05 §2).

Nigerian universities often deviate from static printed calendars. This module inspects a retrieved
university portal/calendar snapshot, extracts the active session and semester with verbatim Claims,
and updates the global UniversitySemesterCache.
"""

import re

from artrat.catalogue.api import (
    Claim,
    EvidenceRef,
    SemesterState,
    SourceSnapshotOut,
    UniversitySemesterIn,
    Verification,
)
from artrat.research.extract import sanitize_snapshot_text

SESSION_RE = re.compile(r"\b(20\d{2}\s*/\s*20\d{2})(?:\s+academic\s+session)?\b", re.IGNORECASE)
FIRST_SEM_RE = re.compile(r"\b(1st\s+semester|first\s+semester|harmattan\s+semester)\b", re.IGNORECASE)
SECOND_SEM_RE = re.compile(r"\b(2nd\s+semester|second\s+semester|rain\s+semester)\b", re.IGNORECASE)
BREAK_RE = re.compile(
    r"\b(session\s+break|long\s+vacation|inter-?semester\s+break|exam\s+processing)\b",
    re.IGNORECASE,
)


def parse_university_semester(
    short_code: str,
    university_name: str,
    source: SourceSnapshotOut,
) -> UniversitySemesterIn | None:
    """Extract a verified UniversitySemesterIn from a university portal/calendar snapshot."""
    clean_text, _ = sanitize_snapshot_text(source.snapshot_text)
    lines = [ln.strip() for ln in clean_text.splitlines() if ln.strip()]

    session_val: str | None = None
    session_line: str | None = None
    sem_val: SemesterState | None = None
    sem_line: str | None = None

    for ln in lines:
        if session_val is None and (m := SESSION_RE.search(ln)):
            raw_years = m.group(1).replace(" ", "")
            session_val = f"{raw_years} Academic Session"
            session_line = ln
        if sem_val is None:
            if SECOND_SEM_RE.search(ln):
                sem_val = SemesterState.SECOND
                sem_line = ln
            elif FIRST_SEM_RE.search(ln):
                sem_val = SemesterState.FIRST
                sem_line = ln
            elif BREAK_RE.search(ln):
                sem_val = SemesterState.BREAK
                sem_line = ln

    if session_val is None or session_line is None or sem_val is None or sem_line is None:
        return None

    session_claim = Claim[str](
        value=session_val,
        verification=Verification.OFFICIAL,
        evidence=(
            EvidenceRef(
                source_id=str(source.id),
                url=source.final_url,
                passage=session_line,
                retrieved_at=source.retrieved_at,
            ),
        ),
        last_verified_at=source.retrieved_at,
    )
    sem_claim = Claim[SemesterState](
        value=sem_val,
        verification=Verification.OFFICIAL,
        evidence=(
            EvidenceRef(
                source_id=str(source.id),
                url=source.final_url,
                passage=sem_line,
                retrieved_at=source.retrieved_at,
            ),
        ),
        last_verified_at=source.retrieved_at,
    )
    end_year = session_val.split("/")[1][:4] if "/" in session_val else str(source.retrieved_at.year + 1)
    return UniversitySemesterIn(
        short_code=short_code.strip().upper(),
        university_name=university_name,
        current_session=session_claim,
        current_semester=sem_claim,
        next_level_promotion_window=f"October {end_year}",
    )
