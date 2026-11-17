from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from artrat.catalogue.claims import Claim, EvidenceRef, Verification, passage_in_snapshot

NOW = datetime(2026, 11, 10, tzinfo=UTC)


def ev(url: str = "https://ptdf.gov.ng/scholarship", passage: str = "Deadline: 30 June") -> EvidenceRef:
    return EvidenceRef(source_id="s1", url=url, passage=passage, retrieved_at=NOW)


def test_unknown_claim_is_null_without_evidence():
    claim = Claim[str].unknown(NOW)
    assert claim.value is None and claim.evidence == ()


def test_model_cannot_fill_an_unknown_field():
    with pytest.raises(ValidationError, match="must have value null"):
        Claim[str](value="30 June", verification=Verification.UNKNOWN, last_verified_at=NOW)


def test_official_claim_needs_evidence():
    with pytest.raises(ValidationError, match="at least one evidence"):
        Claim[str](value="30 June", verification=Verification.OFFICIAL, last_verified_at=NOW)


def test_corroborated_needs_two_independent_domains():
    with pytest.raises(ValidationError, match=">=2 independent domains"):
        Claim[str](
            value="30 June",
            verification=Verification.CORROBORATED,
            evidence=(ev("https://a.com/x"), ev("https://a.com/y")),
            last_verified_at=NOW,
        )
    ok = Claim[str](
        value="30 June",
        verification=Verification.CORROBORATED,
        evidence=(ev("https://a.com/x"), ev("https://b.org/y")),
        last_verified_at=NOW,
    )
    assert ok.verification is Verification.CORROBORATED


def test_passage_match_ignores_whitespace_and_case_only():
    snapshot = "Applications close\n  on  30 June 2027.\nApply online."
    assert passage_in_snapshot("applications close on 30 june 2027", snapshot)
    assert not passage_in_snapshot("Applications close on 31 June 2027", snapshot)
    assert not passage_in_snapshot("   ", snapshot)
