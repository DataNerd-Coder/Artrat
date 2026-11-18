"""URL identity and link relevance for the frontier (docs/05 §5: dedup and loop prevention)."""

from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from artrat.platform.urls import BlockedUrl, assert_public_http_url
from artrat.research.fetch import Link

CANDIDATE_TLDS = (".com", ".org", ".ng", ".com.ng", ".edu.ng", ".net")

TRACKING_PARAMS = {"fbclid", "gclid", "mc_cid", "mc_eid", "igshid", "ref", "ref_src"}
SKIP_EXTENSIONS = (
    ".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp", ".ico", ".css", ".js", ".zip", ".rar",
    ".mp3", ".mp4", ".avi", ".mov", ".woff", ".woff2", ".ttf", ".exe", ".dmg", ".apk",
)
FUNDING_TERMS = (
    "scholarship", "bursar", "grant", "fellowship", "award", "funding", "financial aid",
    "financial-aid", "studentship", "sponsorship", "stipend", "tuition waiver", "endowment",
)


def canonical_url(url: str) -> str:
    """One spelling per page: lowercase scheme/host, no default port, no fragment, no tracking
    parameters, sorted query, '/' for an empty path."""
    parts = urlsplit(url.strip())
    scheme = parts.scheme.lower()
    host = (parts.hostname or "").lower()
    port = parts.port
    netloc = host if port is None or (scheme, port) in {("http", 80), ("https", 443)} else f"{host}:{port}"
    query = sorted(
        (k, v)
        for k, v in parse_qsl(parts.query, keep_blank_values=True)
        if not k.lower().startswith("utm_") and k.lower() not in TRACKING_PARAMS
    )
    return urlunsplit((scheme, netloc, parts.path or "/", urlencode(query), ""))


def site_of(url: str) -> str:
    """The politeness and page-cap unit: host without 'www.', plus a non-default port."""
    parts = urlsplit(canonical_url(url))
    return parts.netloc.removeprefix("www.")


def resolve_dropped_link(raw: str, *, guard=assert_public_http_url) -> str:
    """Resolve a student-dropped link, bare domain ('icanstudent.com'), or extensionless site
    name ('scholarshipregion') into a verified public canonical URL."""
    cleaned = raw.strip()
    if not cleaned:
        raise BlockedUrl("empty link-drop input")
    if "://" in cleaned:
        return canonical_url(guard(cleaned))
    host_part = cleaned.split("/", 1)[0]
    if "." in host_part:
        return canonical_url(guard(f"https://{cleaned}"))
    slug = host_part.lower().replace(" ", "")
    for tld in CANDIDATE_TLDS:
        for prefix in ("https://www.", "https://"):
            candidate = f"{prefix}{slug}{tld}/"
            try:
                return canonical_url(guard(candidate))
            except BlockedUrl:
                continue
    raise BlockedUrl(f"could not resolve extensionless site name {raw!r}")


def funding_term(link: Link) -> str | None:
    """The funding term a link's anchor text or path mentions, if any."""
    haystack = f"{link.anchor} {urlsplit(link.url).path.replace('-', ' ').replace('_', ' ')}".lower()
    return next((t for t in FUNDING_TERMS if t in haystack), None)


def follow_candidates(links: list[Link], from_url: str) -> list[tuple[str, Link, str]]:
    """Same-site, funding-related, non-asset links, deduplicated: (canonical url, link, term)."""
    origin_site = site_of(from_url)
    seen: set[str] = set()
    out = []
    for link in links:
        parts = urlsplit(link.url)
        if parts.scheme not in ("http", "https"):
            continue
        if parts.path.lower().endswith(SKIP_EXTENSIONS):
            continue
        url = canonical_url(link.url)
        if url in seen or site_of(url) != origin_site:
            continue
        term = funding_term(link)
        if term is None:
            continue
        seen.add(url)
        out.append((url, link, term))
    return out
