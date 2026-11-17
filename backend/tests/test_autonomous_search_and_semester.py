"""Tests for P2.4: Thompson-sampling ResearchDirections, SearXNG search -> Scrapling/browser-use
crawl -> PortalBlueprint -> Verified Opportunity loop, and Live University Semester Checker."""

import random
import threading
from datetime import UTC, datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from fastapi.testclient import TestClient

from artrat.api.app import app
from artrat.catalogue import api as catalogue
from artrat.catalogue.api import FetchMode, OpportunityStatus, SemesterState, SnapshotIn
from artrat.platform.config import Settings
from artrat.platform.db import session_scope
from artrat.research import agent
from artrat.research.directions import (
    choose_directions,
    direction_yield_mean,
    ensure_default_directions,
    list_directions,
    record_direction_outcome,
    score_priority,
)
from artrat.research.fetch import Retrieved, http_get
from artrat.research.robots import RobotsCache
from artrat.research.search import SearchLead


def test_thompson_sampling_favors_productive_directions_and_records_signals(session):
    ensure_default_directions(session)
    record_direction_outcome(
        session,
        "nigeria-oil-gas-jv-trusts",
        attempts_delta=10,
        leads_delta=15,
        verified_delta=8,
        cost_delta=0.5,
    )
    for slug in (
        "nigeria-undergrad-stem",
        "nigeria-orphan-indigent-disability",
        "nigeria-state-lga-bursaries",
        "social-scholarship-announcements",
        "international-african-fellowships",
    ):
        record_direction_outcome(
            session, slug, attempts_delta=20, leads_delta=0, verified_delta=0, expired_delta=5
        )
    session.commit()

    dirs = {d.slug: d for d in list_directions(session)}
    assert direction_yield_mean(dirs["nigeria-oil-gas-jv-trusts"]) > 0.65
    assert direction_yield_mean(dirs["nigeria-undergrad-stem"]) < 0.1

    rng = random.Random(42)
    picks = [choose_directions(session, count=1, rng=rng)[0].slug for _ in range(10)]
    assert picks.count("nigeria-oil-gas-jv-trusts") >= 8

    prio, signals = score_priority(
        Settings(database_url="unused"),
        relevance=0.9,
        novelty=1.0,
        demand=1.0,
        direction_yield=0.8,
    )
    assert prio > 2.5
    assert set(signals) == {
        "relevance",
        "novelty",
        "evidence_gap",
        "freshness_due",
        "demand",
        "direction_yield",
        "expected_cost",
        "failure_penalty",
    }


def test_autonomous_search_pipeline_from_searxng_to_scrapling_and_browser_use(session):
    pages: dict[str, str] = {}

    class SiteHandler(BaseHTTPRequestHandler):
        def do_GET(self):
            body = pages.get(self.path)
            self.send_response(200 if body is not None else 404)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            self.wfile.write((body or "not found").encode())

        def log_message(self, *args):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), SiteHandler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{server.server_port}"

    pages["/agbami-award"] = (
        f"<html><title>Agbami Medical and Engineering Scholarship</title><body>"
        f"<h1>Agbami Medical and Engineering Professionals Scholarship 2026/2027</h1>"
        f"<p>Applications close on 15 August 2027.</p>"
        f"<p>Apply at {base}/agbami-portal</p>"
        f"<p>Eligibility: Nigerian 100L and 200L undergraduates with CGPA of 3.50 and above.</p>"
        f"<p>Required upload: University Admission Letter and JAMB Admission Letter from JAMB CAPS.</p>"
        f"</body></html>"
    )
    # Thin static HTML on the portal -> triggers browser-use rendering!
    pages["/agbami-portal"] = "<div id='spa-root'></div>"

    rendered_urls: list[str] = []

    def fake_browser_use_render(url, settings, *, guard):
        rendered_urls.append(url)
        portal_text = (
            "Agbami Scholarship Application Portal 2026/2027\n"
            "Sign in and enter the email OTP verification code.\n"
            "Applicant Full Name, Matriculation Number, and Current CGPA.\n"
            "Upload 1: University Admission Letter from School\n"
            "Upload 2: JAMB CAPS Official Admission Letter\n"
            "Upload 3: Academic Transcript or Semester Result Sheet\n"
            "Upload 4: HOD Attestation Letter\n"
            "I hereby declare that the information provided is accurate."
        )
        return Retrieved(
            snapshot=SnapshotIn(
                url=url,
                final_url=url,
                status_code=200,
                fetch_mode=FetchMode.RENDERED,
                title="Agbami Portal",
                text=portal_text,
                retrieved_at=datetime.now(UTC),
            ),
            links=[],
        )

    def fake_searxng(query: str, settings: Settings) -> list[SearchLead]:
        return [
            SearchLead(
                url=f"{base}/agbami-award?utm_source=searxng",
                title="Agbami Undergraduate Scholarship 2026/2027",
                snippet="Apply online before deadline for Nigerian engineering and medical students.",
                engine="searxng",
            )
        ]

    try:
        settings = Settings(database_url="unused", site_delay_seconds=0, max_depth=1)

        def robots_get(url):
            _, status, body = http_get(url, settings, guard=lambda u: u)
            return status, body

        rt = agent.Runtime(
            settings=settings,
            robots=RobotsCache(robots_get, settings.robots_agent),
            guard=lambda u: u,
            rendered=fake_browser_use_render,
            search=fake_searxng,
        )

        queued_dirs = agent.plan_searches(rt, count=1, rng=random.Random(7))
        assert len(queued_dirs) == 1
        chosen_dir = queued_dirs[0]

        agent.run(rt, until_empty=True, idle_sleep=0)

        assert rendered_urls == [f"{base}/agbami-portal"]

        with session_scope() as s:
            opp = catalogue.get_opportunity(
                s, "agbami-medical-and-engineering-professionals-scholarship-2026-2027"
            )
            bp = catalogue.get_portal_blueprint(s, opp.slug)
            dirs = {d.slug: d for d in list_directions(s)}

        assert opp.status is OpportunityStatus.VERIFIED
        assert bp.version == 1
        assert dirs[chosen_dir].attempts == 1
        assert dirs[chosen_dir].leads_found == 1
        assert dirs[chosen_dir].verified_opportunities == 1
    finally:
        server.shutdown()


def test_live_university_semester_checker_crawls_and_updates_global_cache(session):
    class UniHandler(BaseHTTPRequestHandler):
        def do_GET(self):
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            self.wfile.write(
                b"<html><title>UNILAG Senate Notice</title><body>"
                b"<h1>University of Lagos Official Academic Calendar</h1>"
                b"<p>Current Academic Year: 2025/2026 Academic Session is in progress.</p>"
                b"<p>Lectures and continuous assessment for 2nd Semester have commenced across all faculties.</p>"
                b"</body></html>"
            )

        def log_message(self, *args):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), UniHandler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{server.server_port}"

    try:
        settings = Settings(database_url="unused", site_delay_seconds=0)

        def robots_get(url):
            _, status, body = http_get(url, settings, guard=lambda u: u)
            return status, body

        rt = agent.Runtime(
            settings=settings,
            robots=RobotsCache(robots_get, settings.robots_agent),
            guard=lambda u: u,
        )
        assert agent.enqueue_semester_check(
            rt, "unilag", "University of Lagos (UNILAG)", f"{base}/calendar"
        )
        agent.run(rt, until_empty=True, idle_sleep=0)

        client = TestClient(app)
        res = client.get("/v1/universities/unilag/semester")
        assert res.status_code == 200
        body = res.json()
        assert body["short_code"] == "UNILAG"
        assert body["current_session"]["value"] == "2025/2026 Academic Session"
        assert body["current_semester"]["value"] == SemesterState.SECOND.value
        assert body["next_level_promotion_window"] == "October 2026"

        dirs_res = client.get("/v1/research/directions")
        assert dirs_res.status_code == 200
        assert len(dirs_res.json()) >= 6
    finally:
        server.shutdown()
