"""Retrieve pages for the discovery agent.

Static fetches use Scrapling (DataNerd-Coder/Scrapling). JS-heavy pages go to the isolated
browser worker (browser/), which drives a real browser with browser-use. Both paths return the
same Retrieved shape so the rest of the agent never cares how a page was retrieved.
"""

import io
import xml.etree.ElementTree as ET
import zipfile
from dataclasses import dataclass, field
from datetime import UTC, datetime
from urllib.parse import parse_qs, unquote, urljoin, urlsplit

import httpx
from scrapling.fetchers import Fetcher
from scrapling.parser import Selector

from artrat.catalogue.api import FetchMode, SnapshotIn
from artrat.platform.config import Settings
from artrat.platform.urls import assert_public_http_url

MAX_REDIRECTS = 5
REDIRECT_CODES = {301, 302, 303, 307, 308}


class FetchFailed(RuntimeError):
    """The page could not be retrieved. `retryable` is False for permanent outcomes like 404."""

    def __init__(self, message: str, *, retryable: bool = True) -> None:
        super().__init__(message)
        self.retryable = retryable


@dataclass(frozen=True)
class Link:
    url: str
    anchor: str


@dataclass(frozen=True)
class Retrieved:
    snapshot: SnapshotIn
    links: list[Link] = field(default_factory=list)


@dataclass(frozen=True)
class ParsedPage:
    title: str | None
    text: str
    links: list[Link]


APPLY_ANCHOR_TERMS = (
    "apply now",
    "apply here",
    "click here to apply",
    "application form",
    "online application",
    "application portal",
    "official page",
    "official website",
    "read how to apply",
)


def parse_page(html: str, base_url: str) -> ParsedPage:
    """Title, visible text (scripts and styles removed) and absolute links of an HTML document."""
    page = Selector(html)
    title = page.css("title::text").get()
    links = []
    outbound_apply_lines: list[str] = []
    for a in page.css("a[href]"):
        href = (a.attrib.get("href") or "").strip()
        if href and not href.startswith(("#", "javascript:", "mailto:", "tel:")):
            anchor = " ".join(str(a.get_all_text(separator=" ", strip=True)).split())
            resolved = urljoin(base_url, href)
            links.append(Link(url=resolved, anchor=anchor))
            low_anchor = anchor.lower()
            if any(t in low_anchor for t in APPLY_ANCHOR_TERMS) and resolved.startswith(
                ("http://", "https://")
            ):
                outbound_apply_lines.append(f"Apply at {resolved}")
    control_lines: list[str] = []
    for ctrl in page.css("input, select, textarea"):
        c_type = (ctrl.attrib.get("type") or ctrl.tag or "text").lower()
        if c_type in ("hidden", "submit", "button", "reset", "image"):
            continue
        c_label = (
            ctrl.attrib.get("aria-label")
            or ctrl.attrib.get("placeholder")
            or ctrl.attrib.get("name")
            or ctrl.attrib.get("id")
            or ""
        ).strip()
        if c_label:
            control_lines.append(f"Form Control [{c_type}]: {c_label}")
    for node in page.css("script, style, noscript, template"):
        node._root.getparent().remove(node._root)
    text = str(page.get_all_text(separator="\n", strip=True))
    extras = list(dict.fromkeys(control_lines + outbound_apply_lines))
    if extras:
        text = text + "\n" + "\n".join(extras)
    return ParsedPage(title=title.strip() if title else None, text=text, links=links)


def _check_status(url: str, status: int) -> None:
    if status == 429 or status >= 500:
        raise FetchFailed(f"{url} returned {status}", retryable=True)
    if status >= 400:
        raise FetchFailed(f"{url} returned {status}", retryable=False)


def http_get(url: str, settings: Settings, *, guard=assert_public_http_url):
    """GET with Scrapling, following redirects by hand so every hop passes the public-URL guard.
    Returns (final_url, status, body_text)."""
    current = guard(url)
    for _ in range(MAX_REDIRECTS + 1):
        response = Fetcher.get(
            current,
            timeout=settings.fetch_timeout_seconds,
            follow_redirects=False,
            stealthy_headers=False,
            retries=1,
            headers={"User-Agent": settings.user_agent},
        )
        location = response.headers.get("location") or response.headers.get("Location")
        if response.status in REDIRECT_CODES and location:
            current = guard(urljoin(current, location))
            continue
        body = response.body
        if len(body) > settings.max_snapshot_bytes:
            raise FetchFailed(f"{url} exceeds {settings.max_snapshot_bytes} bytes", retryable=False)
        if body.startswith(b"PK\x03\x04"):
            try:
                with zipfile.ZipFile(io.BytesIO(body)) as zf:
                    if "word/document.xml" in zf.namelist():
                        root = ET.fromstring(zf.read("word/document.xml"))
                        paragraphs: list[str] = []
                        for p in root.iter():
                            if p.tag.endswith("}p"):
                                runs = [
                                    t.text
                                    for t in p.iter()
                                    if t.tag.endswith("}t") and t.text
                                ]
                                line = "".join(runs).strip()
                                if line:
                                    paragraphs.append(line)
                        doc_html = (
                            f"<html><head><title>{current.rsplit('/', 1)[-1]}</title></head>"
                            f"<body><pre>{chr(10).join(paragraphs)}</pre></body></html>"
                        )
                        return current, response.status, doc_html
            except (zipfile.BadZipFile, ET.ParseError):
                pass
        return current, response.status, body.decode(response.encoding or "utf-8", errors="replace")
    raise FetchFailed(f"{url} redirected more than {MAX_REDIRECTS} times", retryable=False)


def _unwrap_google_continue_url(final_url: str) -> str:
    parts = urlsplit(final_url)
    if parts.hostname and parts.hostname.endswith("accounts.google.com"):
        qs = parse_qs(parts.query)
        for key in ("continue", "followup"):
            if qs.get(key):
                candidate = unquote(qs[key][0])
                if candidate.startswith("https://docs.google.com/forms/"):
                    return candidate.split("?")[0]
    return final_url


def fetch_static(url: str, settings: Settings, *, guard=assert_public_http_url) -> Retrieved:
    raw_final_url, status, html = http_get(url, settings, guard=guard)
    _check_status(url, status)
    final_url = _unwrap_google_continue_url(raw_final_url)
    page = parse_page(html, final_url)
    snapshot = SnapshotIn(
        url=url,
        final_url=final_url,
        status_code=status,
        fetch_mode=FetchMode.STATIC,
        title=page.title,
        text=page.text,
        retrieved_at=datetime.now(UTC),
    )
    return Retrieved(snapshot=snapshot, links=page.links)


def fetch_rendered(url: str, settings: Settings, *, guard=assert_public_http_url) -> Retrieved:
    """Ask the browser worker to render & inspect the page; it applies the same guard on its side."""
    guard(url)
    try:
        response = httpx.post(
            f"{settings.browser_url}/inspect",
            json={"url": url},
            timeout=settings.fetch_timeout_seconds + 30,
        )
    except httpx.HTTPError as exc:
        raise FetchFailed(f"browser worker unreachable: {exc}") from exc
    if response.status_code == 422:
        raise FetchFailed(f"browser worker refused {url}: {response.text[:200]}", retryable=False)
    if response.status_code != 200:
        raise FetchFailed(f"browser worker returned {response.status_code}: {response.text[:200]}")
    data = response.json()
    guard(data["final_url"])
    page = parse_page(data["html"], data["final_url"])
    dom_ctrl_lines: list[str] = []
    for ctrl in data.get("controls") or []:
        if isinstance(ctrl, dict):
            c_type = (ctrl.get("input_type") or ctrl.get("tag") or "text").lower()
            if c_type in ("hidden", "submit", "button", "reset", "image"):
                continue
            c_label = (ctrl.get("label") or ctrl.get("name") or "").strip()
            if c_label:
                req = "required" if ctrl.get("required") else "optional"
                dom_ctrl_lines.append(f"Form Control [{c_type}, {req}]: {c_label}")
    full_text = page.text
    if dom_ctrl_lines:
        new_lines = [ln for ln in dict.fromkeys(dom_ctrl_lines) if ln not in full_text]
        if new_lines:
            full_text = full_text + "\n" + "\n".join(new_lines)
    snapshot = SnapshotIn(
        url=url,
        final_url=data["final_url"],
        status_code=200,
        fetch_mode=FetchMode.RENDERED,
        title=page.title or data.get("title"),
        text=full_text,
        retrieved_at=datetime.fromisoformat(data["retrieved_at"]),
    )
    return Retrieved(snapshot=snapshot, links=page.links)
