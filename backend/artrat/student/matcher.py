"""Strict Binary Eligibility Matcher (docs/05 §4).

Artrat never computes a misleading "90% qualified" score. Hard academic and identity rules must be
100% satisfied; obtainable documents and endorsements never disqualify a student upfront.
"""

import re
from dataclasses import dataclass, field

from artrat.catalogue.api import CriterionKey, OpportunityOut
from artrat.student.tables import ProfileFactRow, StudentRow

CGPA_NUM_RE = re.compile(r"\b([1-5]\.\d{1,2})\b")
LEVEL_TOKEN_RE = re.compile(r"\b([1-6]00)\s*(?:l|level)\b", re.IGNORECASE)


@dataclass(frozen=True)
class MatchDecision:
    eligible: bool
    failed_hard_rules: list[str] = field(default_factory=list)


def _parse_float(text: str) -> float | None:
    m = CGPA_NUM_RE.search(text)
    return float(m.group(1)) if m else None


def _levels_in_text(text: str) -> set[str]:
    return {f"{m.group(1)} Level" for m in LEVEL_TOKEN_RE.finditer(text)}


def evaluate_eligibility(
    student: StudentRow,
    facts: dict[str, ProfileFactRow],
    opportunity: OpportunityOut,
) -> MatchDecision:
    """Evaluate all hard CriterionRequirements on `opportunity` against `student` and `facts`."""
    failed: list[str] = []
    raw_reqs = opportunity.claims.get("requirements") or []

    student_cgpa = _parse_float(facts["cgpa"].value) if "cgpa" in facts else None
    parent_status = (facts["parentStatus"].value if "parentStatus" in facts else "").lower()
    disability_val = (facts["disability"].value if "disability" in facts else "").lower()

    for req in raw_reqs:
        if req.get("kind") != "criterion" or not req.get("hard", True):
            continue
        key = req.get("key")
        rule = str(req.get("rule") or "")
        low = rule.lower()

        if key == CriterionKey.CGPA.value:
            required_cgpa = 4.50 if "first class" in low and not CGPA_NUM_RE.search(low) else _parse_float(rule)
            if required_cgpa is not None:
                if student_cgpa is None:
                    failed.append(f"cgpa: requires >= {required_cgpa:.2f}, student CGPA unknown")
                elif student_cgpa < required_cgpa:
                    failed.append(
                        f"cgpa: requires >= {required_cgpa:.2f}, student has {student_cgpa:.2f}"
                    )

            allowed_levels = _levels_in_text(rule)
            if allowed_levels and student.academic_level not in allowed_levels:
                failed.append(
                    f"studyLevel: requires {sorted(allowed_levels)}, student is {student.academic_level}"
                )

        elif key == CriterionKey.STUDY_LEVEL.value:
            allowed_levels = _levels_in_text(rule)
            if allowed_levels and student.academic_level not in allowed_levels:
                failed.append(
                    f"studyLevel: requires {sorted(allowed_levels)}, student is {student.academic_level}"
                )

        elif key == CriterionKey.ORPHAN_OR_FATHERLESS.value:
            # A soft priority ("priority for orphan...") does not exclude non-orphan students;
            # a strict requirement ("Eligibility: Orphan or fatherless...") does.
            if "priority for" not in low and not any(
                w in parent_status for w in ("orphan", "fatherless", "deceased", "late")
            ):
                failed.append("orphanOrFatherless: requires orphan or fatherless status")

        elif key == CriterionKey.DISABILITY.value:
            if (
                "priority for" not in low
                and " or " not in low
                and (not disability_val or disability_val in ("none", "no", "nil"))
            ):
                failed.append("disability: requires documented disability status")

        elif (
            key == CriterionKey.STATE_OF_ORIGIN.value
            and student.state_of_origin.lower() not in low
        ):
            failed.append(
                f"stateOfOrigin: rule '{rule}' does not match {student.state_of_origin}"
            )

    return MatchDecision(eligible=(len(failed) == 0), failed_hard_rules=failed)
