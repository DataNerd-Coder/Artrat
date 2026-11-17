"""The whole loop against a local site: seed -> fetch -> follow funding links -> store Sources."""

import threading
from datetime import UTC, datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import pytest
from sqlalchemy import select

from artrat.catalogue import api as catalogue
from artrat.catalogue.api import FetchMode, SnapshotIn
from artrat.platform.config import Settings
from artrat.platform.db import session_scope
from artrat.research import agent
from artrat.research.fetch import Retrieved, http_get
from artrat.research.robots import RobotsCache
from artrat.research.tables import ResearchTaskRow, TaskKind, TaskStatus

LONG = "Eligibility: Nigerian undergraduates with a CGPA of 3.5 or above. " * 5

PAGES = {
    "/robots.txt": "User-agent: *\nDisallow: /private\n",
    "/": f"""<a href="/scholarships">Scholarships</a> <a href="/about">About us</a>
        <a href="/private/scholarship-admin">Scholarship admin</a>
        <a href="/old-scholarship">Old scholarship</a> <a href="/bursary-app">Bursary</a>
        <a href="https://elsewhere.org/scholarship">Partner scholarship</a><p>{LONG}</p>""",
    "/scholarships": f"""<a href="/scholarships/nnpc">NNPC award</a><p>{LONG}</p>""",
    "/scholarships/nnpc": f"""<a href="/scholarships/nnpc/grants">Grants</a><p>{LONG}</p>""",
    "/scholarships/nnpc/grants": f"<p>{LONG}</p>",
    "/bursary-app": "<div id=root></div>",  # JS app: almost no static text
    "/about": f"<p>{LONG}</p>",
}


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        body = PAGES.get(self.path)
        self.send_response(200 if body is not None else 404)
        self.send_header("Content-Type", "text/plain" if self.path.endswith(".txt") else "text/html")
        self.end_headers()
        self.wfile.write((body or "not found").encode())

    def log_message(self, *args):
        pass


@pytest.fixture(scope="module")
def site():
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{server.server_port}"
    server.shutdown()


def test_agent_crawls_funding_pages_politely_and_stops(session, site):
    settings = Settings(database_url="unused", site_delay_seconds=0, max_depth=2)
    rendered_calls = []

    def fake_render(url, settings, *, guard):
        rendered_calls.append(url)
        snap = SnapshotIn(
            url=url, final_url=url, status_code=200, fetch_mode=FetchMode.RENDERED,
            title="Bursary application", text="Bursary application form " + LONG,
            retrieved_at=datetime.now(UTC),
        )
        return Retrieved(snapshot=snap, links=[])

    def robots_get(url):
        _, status, body = http_get(url, settings, guard=lambda u: u)
        return status, body

    rt = agent.Runtime(
        settings=settings,
        robots=RobotsCache(robots_get, settings.robots_agent),
        guard=lambda u: u,
        rendered=fake_render,
    )
    assert agent.seed(rt, [f"{site}/"]) == 1
    assert agent.seed(rt, [f"{site}/"]) == 0, "seeding twice is a no-op"

    agent.run(rt, until_empty=True, idle_sleep=0)

    with session_scope() as s:
        tasks = {(t.kind, t.key.removeprefix(site)): t for t in s.scalars(select(ResearchTaskRow))}
        fetched = {src.url.removeprefix(site) for src in catalogue.list_sources(s, 100)}

    status = {k: t.status for k, t in tasks.items()}
    assert status == {
        (TaskKind.FETCH, "/"): TaskStatus.DONE,
        (TaskKind.FETCH, "/scholarships"): TaskStatus.DONE,
        (TaskKind.FETCH, "/scholarships/nnpc"): TaskStatus.DONE,  # depth 2 = max_depth
        (TaskKind.FETCH, "/private/scholarship-admin"): TaskStatus.SKIPPED,  # robots.txt
        (TaskKind.FETCH, "/old-scholarship"): TaskStatus.DEAD,  # 404 is permanent
        (TaskKind.FETCH, "/bursary-app"): TaskStatus.DONE,
        (TaskKind.RENDER, "/bursary-app"): TaskStatus.DONE,  # thin static text -> browser
    }, "no /about (not funding), no elsewhere.org (other site), no depth-3 /grants"
    assert tasks[(TaskKind.FETCH, "/old-scholarship")].attempts == 1
    assert tasks[(TaskKind.FETCH, "/scholarships")].reason["term"] == "scholarship"
    assert rendered_calls == [f"{site}/bursary-app"]
    assert fetched == {"/", "/scholarships", "/scholarships/nnpc", "/bursary-app"}
