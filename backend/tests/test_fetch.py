import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import pytest

from artrat.platform.config import Settings
from artrat.platform.urls import BlockedUrl, assert_public_http_url
from artrat.research.fetch import fetch_static

PAGE = b"""<html><head><title>NNPC/Total Scholarship</title><style>.x{}</style></head>
<body><h1>NNPC/Total National Merit Scholarship</h1><script>var hidden = 1;</script>
<p>Applications close on 15 March 2027.</p></body></html>"""


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/old":
            self.send_response(301)
            self.send_header("Location", "/scholarship")
            self.end_headers()
            return
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(PAGE)

    def log_message(self, *args):
        pass


@pytest.fixture(scope="module")
def site():
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{server.server_port}"
    server.shutdown()


SETTINGS = Settings(database_url="unused")


def test_scrapling_fetch_extracts_visible_text_and_follows_redirects(site):
    hops: list[str] = []

    def record(url: str) -> str:
        hops.append(url)
        return url

    snap = fetch_static(f"{site}/old", SETTINGS, guard=record).snapshot
    assert hops == [f"{site}/old", f"{site}/scholarship"], "every redirect hop passes the guard"
    assert snap.final_url == f"{site}/scholarship"
    assert snap.title == "NNPC/Total Scholarship"
    assert "Applications close on 15 March 2027." in snap.text
    assert "var hidden" not in snap.text and ".x{}" not in snap.text


def test_redirect_into_blocked_address_is_refused(site):
    def block_second_hop(url: str) -> str:
        if url.endswith("/scholarship"):
            raise BlockedUrl("private")
        return url

    with pytest.raises(BlockedUrl):
        fetch_static(f"{site}/old", SETTINGS, guard=block_second_hop)


@pytest.mark.parametrize(
    "url",
    [
        "http://127.0.0.1/admin",
        "http://localhost:5432",
        "http://169.254.169.254/latest/meta-data",
        "http://10.0.0.5/",
        "file:///etc/passwd",
        "https://user:pw@example.com/",
    ],
)
def test_guard_blocks_non_public_targets(url):
    with pytest.raises(BlockedUrl):
        assert_public_http_url(url)
