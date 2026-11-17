from datetime import UTC, datetime

from fastapi.testclient import TestClient

from artrat.api.app import app
from artrat.catalogue import api as catalogue


def test_health_reports_database(session):
    assert TestClient(app).get("/health").json() == {"status": "ok", "database": "ok"}


def test_sources_endpoint_lists_stored_snapshots(session):
    catalogue.store_snapshot(
        session,
        catalogue.SnapshotIn(
            url="https://mtnfoundation.org/scholarship",
            final_url="https://mtnfoundation.org/scholarship",
            status_code=200,
            fetch_mode=catalogue.FetchMode.STATIC,
            title="MTN Foundation Scholarship",
            text="MTN Foundation Science and Technology Scholarship",
            retrieved_at=datetime.now(UTC),
        ),
    )
    session.commit()
    body = TestClient(app).get("/v1/sources").json()
    assert [s["title"] for s in body] == ["MTN Foundation Scholarship"]
    assert "snapshot_text" not in body[0]
