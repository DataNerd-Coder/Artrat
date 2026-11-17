"""Claim: the provenance shape for every factual Opportunity field (ADR 0006, docs/04 §2.1)."""

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, model_validator


class Verification(StrEnum):
    OFFICIAL = "official"
    CORROBORATED = "corroborated"
    INFERRED = "inferred"
    UNKNOWN = "unknown"
    CONFLICTING = "conflicting"


class EvidenceRef(BaseModel):
    model_config = ConfigDict(frozen=True)

    source_id: str
    url: HttpUrl
    passage: str = Field(min_length=1)
    retrieved_at: datetime
    locator: str | None = None


class Claim[T](BaseModel):
    """A value plus how we know it. Unknown is null with no evidence; nothing else may be null."""

    model_config = ConfigDict(frozen=True)

    value: T | None
    verification: Verification
    evidence: tuple[EvidenceRef, ...] = ()
    last_verified_at: datetime

    @model_validator(mode="after")
    def _unknown_iff_null(self) -> "Claim[T]":
        if self.verification is Verification.UNKNOWN:
            if self.value is not None:
                raise ValueError("an unknown claim must have value null; the model may never fill it")
            if self.evidence:
                raise ValueError("an unknown claim carries no evidence")
        else:
            if self.value is None:
                raise ValueError(f"a {self.verification} claim needs a value; use unknown instead")
            if not self.evidence:
                raise ValueError(f"a {self.verification} claim needs at least one evidence passage")
        if self.verification is Verification.CORROBORATED and (
            len({str(e.url.host) for e in self.evidence}) < 2
        ):
            raise ValueError("a corroborated claim needs evidence from >=2 independent domains")
        return self

    @classmethod
    def unknown(cls, at: datetime) -> "Claim[T]":
        return cls(value=None, verification=Verification.UNKNOWN, last_verified_at=at)


def _normalise(text: str) -> str:
    return " ".join(text.split()).casefold()


def passage_in_snapshot(passage: str, snapshot_text: str) -> bool:
    """Evidence passages must string-match the stored snapshot (ADR 0006), whitespace-insensitive."""
    needle = _normalise(passage)
    return bool(needle) and needle in _normalise(snapshot_text)
