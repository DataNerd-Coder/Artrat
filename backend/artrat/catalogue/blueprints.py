"""Portal Blueprint (docs/04 §2.3) and University Semester Cache (docs/04 §2.5) shapes."""

import uuid
from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field

from artrat.catalogue.claims import Claim
from artrat.catalogue.requirements import DocumentType, SignerRole


class AutomationPolicy(StrEnum):
    PERMITTED = "permitted"
    EXPLICITLY_BANNED = "explicitly_banned"


class AuthStep(StrEnum):
    LOGIN = "login"
    OAUTH = "oauth"
    EMAIL_OTP = "email_otp"
    CAPTCHA = "captcha"
    MFA = "mfa"


class PortalFieldSpec(BaseModel):
    model_config = ConfigDict(frozen=True)

    name: str = Field(min_length=1)
    label: str = Field(min_length=1)
    field_type: str = "text"
    required: bool = True


class PortalUploadSpec(BaseModel):
    model_config = ConfigDict(frozen=True)

    name: str = Field(min_length=1)
    label: str = Field(min_length=1)
    doc_type: DocumentType
    formats: tuple[str, ...] = ("pdf",)
    max_kb: int = Field(default=2048, ge=1)
    signed_by: SignerRole | None = None


class PortalEssaySpec(BaseModel):
    model_config = ConfigDict(frozen=True)

    prompt_id: str = Field(min_length=1)
    prompt: str = Field(min_length=1)
    word_limit: int | None = Field(default=None, ge=1)


class PortalBlueprintDraft(BaseModel):
    opportunity_slug: str = Field(min_length=1)
    portal_url: str = Field(min_length=1)
    fields: tuple[PortalFieldSpec, ...] = ()
    uploads: tuple[PortalUploadSpec, ...] = ()
    essay_prompts: tuple[PortalEssaySpec, ...] = ()
    declarations: tuple[str, ...] = ()
    auth_steps: tuple[AuthStep, ...] = ()
    automation_policy: Claim[AutomationPolicy]


class PortalBlueprintOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    opportunity_id: uuid.UUID
    portal_url: str
    version: int
    fields: list[PortalFieldSpec]
    uploads: list[PortalUploadSpec]
    essay_prompts: list[PortalEssaySpec]
    declarations: list[str]
    auth_steps: list[AuthStep]
    automation_policy: Claim[AutomationPolicy]
    inspected_at: datetime


class SemesterState(StrEnum):
    FIRST = "1st Semester"
    SECOND = "2nd Semester"
    BREAK = "Session Break / Exam Processing"


class UniversitySemesterIn(BaseModel):
    short_code: str = Field(min_length=2, max_length=32)
    university_name: str = Field(min_length=2)
    current_session: Claim[str]
    current_semester: Claim[SemesterState]
    next_level_promotion_window: str = Field(min_length=1)


class UniversitySemesterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    short_code: str
    university_name: str
    current_session: Claim[str]
    current_semester: Claim[SemesterState]
    next_level_promotion_window: str
    last_checked_at: datetime
