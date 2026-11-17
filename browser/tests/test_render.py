import asyncio
import os

import pytest

from artrat_browser.app import BlockedUrl, assert_public_http_url, render


@pytest.mark.parametrize(
    "url", ["http://127.0.0.1:8000", "http://169.254.169.254/", "file:///etc/passwd", "ftp://x.org"]
)
def test_guard_blocks_non_public_targets(url):
    with pytest.raises(BlockedUrl):
        assert_public_http_url(url)


@pytest.mark.skipif(
    not os.environ.get("ARTRAT_BROWSER_EXECUTABLE"), reason="needs a local Chromium/Edge binary"
)
def test_renders_a_real_public_page():
    result = asyncio.run(render("https://example.com"))
    assert result.final_url.startswith("https://example.com")
    assert "Example Domain" in result.html
