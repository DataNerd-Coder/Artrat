"""Dynamic Opportunity Requirements (docs/04 §2.4, docs/05 §4).

Hard identity/academic criteria are separated from obtainable documents, essays, and referees.
School Admission Letter and JAMB Admission Letter are distinct DocumentTypes (Non-negotiable #3).
"""

from enum import StrEnum
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

from artrat.catalogue.claims import Claim


class CriterionKey(StrEnum):
    NATIONALITY = "nationality"
    STUDY_LEVEL = "studyLevel"
    FIELD = "field"
    CGPA = "cgpa"
    JAMB_SCORE = "jambScore"
    AGE = "age"
    INCOME = "income"
    GENDER = "gender"
    STATE_OF_ORIGIN = "stateOfOrigin"
    LGA = "lga"
    INSTITUTION = "institution"
    ORPHAN_OR_FATHERLESS = "orphanOrFatherless"
    DISABILITY = "disability"
    OTHER = "other"


class DocumentType(StrEnum):
    WAEC_RESULT = "waec_result"
    JAMB_RESULT = "jamb_result"
    SCHOOL_ADMISSION_LETTER = "school_admission_letter"
    JAMB_ADMISSION_LETTER = "jamb_admission_letter"
    SCHOOL_ID = "school_id"
    NIN_SLIP = "nin_slip"
    PASSPORT_PHOTO = "passport_photo"
    CV = "cv"
    TRANSCRIPT = "transcript"
    LGA_CERTIFICATE = "lga_certificate"
    BANK_STATEMENT = "bank_statement"
    DYNAMIC_ENDORSEMENT = "dynamic_endorsement"


class SignerRole(StrEnum):
    ACADEMIC_REFEREE = "academic_referee"
    MENTOR = "mentor"
    GUARANTOR = "guarantor"
    HOD = "hod"
    DEAN = "dean"
    EXAM_OFFICER = "exam_officer"
    EMPLOYER = "employer"
    COMMUNITY_LEADER = "community_leader"
    CLERGY = "clergy"
    GUARDIAN = "guardian"
    OTHER = "other"


class CriterionRequirement(BaseModel):
    model_config = ConfigDict(frozen=True)

    kind: Literal["criterion"] = "criterion"
    key: CriterionKey
    rule: str = Field(min_length=1)
    hard: bool = True
    claim: Claim[str]


class DocumentRequirement(BaseModel):
    model_config = ConfigDict(frozen=True)

    kind: Literal["document"] = "document"
    doc_type: DocumentType
    signed_by: SignerRole | None = None
    on_request_only: bool = False
    claim: Claim[str]


class EssayRequirement(BaseModel):
    model_config = ConfigDict(frozen=True)

    kind: Literal["essay"] = "essay"
    prompt_id: str = Field(min_length=1)
    word_limit: int | None = Field(default=None, ge=1)
    claim: Claim[str]


class RefereeRequirement(BaseModel):
    model_config = ConfigDict(frozen=True)

    kind: Literal["referee"] = "referee"
    count: int = Field(ge=1)
    roles: tuple[SignerRole, ...] = ()
    claim: Claim[str]


Requirement = Annotated[
    CriterionRequirement | DocumentRequirement | EssayRequirement | RefereeRequirement,
    Field(discriminator="kind"),
]
