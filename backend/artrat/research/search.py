"""SearXNG metasearch client for the autonomous discovery loop (docs/05 §1.1, §2).

SearXNG finds candidate URLs; Scrapling and browser-use then crawl and inspect them.
"""

from collections.abc import Callable
from dataclasses import dataclass
from urllib.parse import unquote, urlencode, urlsplit

import httpx
from scrapling.fetchers import Fetcher
from scrapling.parser import Selector

from artrat.platform.config import Settings
from artrat.research.fetch import FetchFailed
from artrat.research.links import SKIP_EXTENSIONS, canonical_url


@dataclass(frozen=True)
class SearchLead:
    url: str
    title: str
    snippet: str
    engine: str = "searxng"


Searcher = Callable[[str, Settings], list[SearchLead]]


def _scrapling_html_search(query: str, settings: Settings) -> list[SearchLead]:
    """Direct Scrapling HTML search fallback when the local SearXNG container is not running."""
    search_url = f"https://search.yahoo.com/search?{urlencode({'p': query})}"
    resp = Fetcher.get(
        search_url,
        timeout=settings.fetch_timeout_seconds,
        stealthy_headers=True,
    )
    if resp.status != 200:
        raise FetchFailed(f"search fallback returned {resp.status}", retryable=True)
    sel = Selector(resp.body.decode(resp.encoding or "utf-8", errors="replace"))
    seen: set[str] = set()
    leads: list[SearchLead] = []
    for a in sel.css("a[href]"):
        href = (a.attrib.get("href") or "").strip()
        if "/RU=http" in href:
            raw_ru = href.split("/RU=", 1)[1].split("/RK=", 1)[0]
            href = unquote(raw_ru)
        elif "yahoo.com" in href:
            continue
        parts = urlsplit(href)
        if parts.scheme not in ("http", "https") or not parts.hostname:
            continue
        if any(
            parts.hostname.endswith(d)
            for d in ("yahoo.com", "yahoodns.net", "bing.com", "microsoft.com")
        ) or parts.path.lower().endswith(SKIP_EXTENSIONS):
            continue
        canon = canonical_url(href)
        if canon in seen:
            continue
        seen.add(canon)
        title = " ".join(str(a.get_all_text(separator=" ", strip=True)).split())
        leads.append(SearchLead(url=canon, title=title, snippet="", engine="scrapling_search"))
        if len(leads) >= settings.max_search_leads_per_query:
            break
    return leads


def searxng_search(query: str, settings: Settings) -> list[SearchLead]:
    """Query SearXNG's JSON API (falling back to Scrapling HTML search if default local SearXNG is down)."""
    try:
        response = httpx.get(
            f"{settings.searxng_url.rstrip('/')}/search",
            params={"q": query, "format": "json"},
            headers={"User-Agent": settings.user_agent},
            timeout=settings.fetch_timeout_seconds,
        )
    except httpx.HTTPError as exc:
        if "localhost" in settings.searxng_url:
            return _scrapling_html_search(query, settings)
        raise FetchFailed(f"searxng unreachable: {exc}", retryable=True) from exc
    if response.status_code != 200:
        raise FetchFailed(
            f"searxng returned {response.status_code}: {response.text[:200]}",
            retryable=response.status_code == 429 or response.status_code >= 500,
        )
    payload = response.json()
    seen: set[str] = set()
    leads: list[SearchLead] = []
    for item in payload.get("results", []):
        raw_url = (item.get("url") or "").strip()
        if not raw_url:
            continue
        parts = urlsplit(raw_url)
        if parts.scheme not in ("http", "https"):
            continue
        if parts.path.lower().endswith(SKIP_EXTENSIONS):
            continue
        canon = canonical_url(raw_url)
        if canon in seen:
            continue
        seen.add(canon)
        leads.append(
            SearchLead(
                url=canon,
                title=(item.get("title") or "").strip(),
                snippet=(item.get("content") or "").strip(),
                engine=(item.get("engine") or "searxng").strip(),
            )
        )
        if len(leads) >= settings.max_search_leads_per_query:
            break
    return leads
