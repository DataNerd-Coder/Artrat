from artrat.research.fetch import Link
from artrat.research.links import canonical_url, follow_candidates, site_of
from artrat.research.robots import RobotsCache


def test_canonical_url_gives_one_spelling_per_page():
    assert (
        canonical_url("HTTPS://WWW.Example.org:443/Funding?utm_source=x&b=2&a=1#apply")
        == "https://www.example.org/Funding?a=1&b=2"
    )
    assert canonical_url("http://example.org") == "http://example.org/"
    assert canonical_url("http://example.org:8080/x") == "http://example.org:8080/x"


def test_site_ignores_www_but_keeps_port():
    assert site_of("https://www.unilag.edu.ng/a") == site_of("https://unilag.edu.ng/b") == "unilag.edu.ng"
    assert site_of("http://127.0.0.1:5000/") == "127.0.0.1:5000"


def test_follows_only_same_site_funding_links():
    links = [
        Link("https://unilag.edu.ng/scholarships/2027", "Undergraduate awards"),
        Link("https://www.unilag.edu.ng/news/123", "Postgraduate Bursary open"),
        Link("https://unilag.edu.ng/sports", "Sports day"),
        Link("https://unilag.edu.ng/scholarships/2027#faq", "FAQ"),
        Link("https://other.org/scholarship", "External scholarship"),
        Link("https://unilag.edu.ng/scholarship-poster.jpg", "Scholarship poster"),
    ]
    got = follow_candidates(links, "https://unilag.edu.ng/")
    assert [(url, term) for url, _, term in got] == [
        ("https://unilag.edu.ng/scholarships/2027", "scholarship"),
        ("https://www.unilag.edu.ng/news/123", "bursar"),
    ]


def robots(status: int, body: str = "", *, raises: bool = False) -> RobotsCache:
    def get(_url):
        if raises:
            raise ConnectionError("down")
        return status, body

    return RobotsCache(get, "ArtratBot")


def test_robots_rules_are_honoured():
    rc = robots(200, "User-agent: *\nDisallow: /private\n\nUser-agent: ArtratBot\nDisallow: /portal\n")
    assert rc.allowed("https://x.org/scholarships")
    assert not rc.allowed("https://x.org/portal/apply")


def test_missing_robots_allows_but_unreadable_robots_disallows():
    assert robots(404).allowed("https://x.org/anything")
    assert not robots(503).allowed("https://x.org/anything")
    assert not robots(0, raises=True).allowed("https://x.org/anything")
