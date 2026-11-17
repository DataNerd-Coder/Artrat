"""SearXNG metasearch client for the autonomous discovery loop (docs/05 §1.1, §2).

SearXNG finds candidate URLs; Scrapling and browser-use then crawl and inspect them.
"""

from collections.abc import Callable
from dataclasses import dataclass
from urllib.parse import urlsplit

import httpx

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


def searxng_search(query: str, settings: Settings) -> list[SearchLead]:
    """Query SearXNG's JSON API and return deduplicated http/https leads."""
    try:
        response = httpx.get(
            f"{settings.searxng_url.rstrip('/')}/search",
            params={"q": query, "format": "json"},
            headers={"User-Agent": settings.user_agent},
            timeout=settings.fetch_timeout_seconds,
        )
    except httpx.HTTPError as exc:
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
