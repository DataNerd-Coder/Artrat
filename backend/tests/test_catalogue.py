from datetime import UTC, datetime

import pytest

from artrat.catalogue import api as catalogue
from artrat.catalogue.api import Claim, EvidenceRef, FetchMode, Verification

NOW = datetime(2026, 11, 10, tzinfo=UTC)
PAGE = "PTDF Overseas Scholarship 2026/2027\nApplications close on 30 June 2027.\nApply at portal.ptdf.gov.ng"


def snapshot(text: str = PAGE) -> catalogue.SnapshotIn:
    return catalogue.SnapshotIn(
        url="https://ptdf.gov.ng/os",
        final_url="https://ptdf.gov.ng/os",
        status_code=200,
        fetch_mode=FetchMode.STATIC,
        title="PTDF",
        text=text,
        retrieved_at=NOW,
    )


def draft(source_id: str, passage: str) -> catalogue.OpportunityDraft:
    evidence = (
        EvidenceRef(source_id=source_id, url="https://ptdf.gov.ng/os", passage=passage, retrieved_at=NOW),
    )
    return catalogue.OpportunityDraft(
        slug="ptdf-overseas-2026-2027",
        cycle="2026/2027",
        title=Claim[str](
            value="PTDF Overseas Scholarship",
            verification=Verification.OFFICIAL,
            evidence=(
                EvidenceRef(
                    source_id=source_id,
                    url="https://ptdf.gov.ng/os",
                    passage="PTDF Overseas Scholarship 2026/2027",
                    retrieved_at=NOW,
                ),
            ),
            last_verified_at=NOW,
        ),
        official_url=Claim[str].unknown(NOW),
        application_url=Claim[str].unknown(NOW),
        deadline=Claim[datetime](
            value=datetime(2027, 6, 30, 23, 59, tzinfo=UTC),
            verification=Verification.OFFICIAL,
            evidence=evidence,
            last_verified_at=NOW,
        ),
    )


def test_same_content_is_stored_once(session):
    first = catalogue.store_snapshot(session, snapshot())
    again = catalogue.store_snapshot(session, snapshot())
    changed = catalogue.store_snapshot(session, snapshot(PAGE + "\nUpdated."))
    assert first.id == again.id
    assert changed.id != first.id
    assert len(catalogue.list_sources(session)) == 2


def test_opportunity_with_verbatim_evidence_is_recorded_as_candidate(session):
    source = catalogue.store_snapshot(session, snapshot())
    opp = catalogue.record_opportunity(session, draft(str(source.id), "Applications close on 30 June 2027."))
    assert opp.status is catalogue.OpportunityStatus.CANDIDATE
    assert opp.claims["deadline"]["verification"] == "official"
    assert opp.claims["official_url"]["value"] is None


def test_evidence_not_in_snapshot_is_rejected(session):
    source = catalogue.store_snapshot(session, snapshot())
    with pytest.raises(catalogue.EvidenceMismatch):
        catalogue.record_opportunity(session, draft(str(source.id), "Applications close on 31 July 2027."))


def test_recording_twice_updates_instead_of_duplicating(session):
    source = catalogue.store_snapshot(session, snapshot())
    d = draft(str(source.id), "Applications close on 30 June 2027.")
    a = catalogue.record_opportunity(session, d)
    b = catalogue.record_opportunity(session, d)
    assert a.id == b.id
    assert len(catalogue.list_opportunities(session)) == 1
