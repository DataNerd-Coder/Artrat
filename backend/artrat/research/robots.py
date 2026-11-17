"""robots.txt for discovery crawls (docs/05 §5 Politeness), parsed with Protego.

RFC 9309: a 4xx robots.txt means no restrictions; a 5xx or unreachable robots.txt means
assume everything is disallowed until it can be read.
"""

import time
from collections.abc import Callable
from dataclasses import dataclass, field
from urllib.parse import urlsplit

from protego import Protego

ROBOTS_TTL_SECONDS = 24 * 3600
ROBOTS_RETRY_SECONDS = 3600  # an unreadable robots.txt is re-checked sooner

# (robots_url) -> (status, body); raises on network failure
RobotsGetter = Callable[[str], tuple[int, str]]


@dataclass
class RobotsCache:
    get: RobotsGetter
    user_agent: str
    _entries: dict[str, tuple[float, Protego | None, bool]] = field(default_factory=dict)

    def _load(self, origin: str) -> tuple[Protego | None, bool]:
        try:
            status, body = self.get(f"{origin}/robots.txt")
        except Exception:  # noqa: BLE001 - any failure to read robots means "disallow for now"
            return None, False
        if 400 <= status < 500:
            return None, True
        if status >= 500:
            return None, False
        return Protego.parse(body), True

    def allowed(self, url: str) -> bool:
        parts = urlsplit(url)
        origin = f"{parts.scheme}://{parts.netloc}"
        cached = self._entries.get(origin)
        if cached is None or time.monotonic() > cached[0]:
            rules, default = self._load(origin)
            unreadable = rules is None and not default
            ttl = ROBOTS_RETRY_SECONDS if unreadable else ROBOTS_TTL_SECONDS
            cached = (time.monotonic() + ttl, rules, default)
            self._entries[origin] = cached
        _, rules, default = cached
        return default if rules is None else rules.can_fetch(url, self.user_agent)
