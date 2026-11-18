"""Browser worker: renders JS-heavy pages and dry-run inspects portals with browser-use
(DataNerd-Coder/browser-use).

Runs in its own image with no database credentials and no student data. Each request gets a
fresh, throwaway browser so no cookies or sessions cross jobs (docs/03 browser-worker row).
"""

import asyncio
import ipaddress
import json
import os
import shutil
import socket
import tempfile
from datetime import UTC, datetime
from urllib.parse import parse_qs, unquote, urlsplit

os.environ.setdefault("ANONYMIZED_TELEMETRY", "false")
os.environ.setdefault("BROWSER_USE_CLOUD_SYNC", "false")

from browser_use import BrowserProfile, BrowserSession  # noqa: E402
from fastapi import FastAPI, HTTPException  # noqa: E402
from pydantic import BaseModel, Field  # noqa: E402

DOM_CONTROLS_JS = """() => {
  const labelFor = (el) => {
    if (el.id) {
      const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lbl && lbl.innerText.trim()) return lbl.innerText.trim();
    }
    const parentLbl = el.closest('label');
    if (parentLbl && parentLbl.innerText.trim()) return parentLbl.innerText.trim();
    return el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.name || el.id || '';
  };
  return Array.from(document.querySelectorAll('input, select, textarea')).map((el) => ({
    tag: el.tagName.toLowerCase(),
    input_type: (el.getAttribute('type') || (el.tagName === 'TEXTAREA' ? 'textarea' : 'text')).toLowerCase(),
    name: el.getAttribute('name') || el.getAttribute('id') || '',
    label: labelFor(el),
    accept: el.getAttribute('accept') || '',
    required: el.hasAttribute('required'),
  }));
}"""


class BlockedUrl(ValueError):
    pass


def assert_public_http_url(url: str) -> str:
    """Same rule as artrat.platform.urls; duplicated so this image never imports the backend."""
    parts = urlsplit(url)
    if parts.scheme not in ("http", "https"):
        raise BlockedUrl(f"scheme {parts.scheme!r} is not allowed")
    if parts.username or parts.password:
        raise BlockedUrl("credentials in URLs are not allowed")
    if not parts.hostname:
        raise BlockedUrl("URL has no host")
    try:
        infos = socket.getaddrinfo(parts.hostname, parts.port or 443)
    except socket.gaierror as exc:
        raise BlockedUrl(f"cannot resolve {parts.hostname}") from exc
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if not ip.is_global:
            raise BlockedUrl(f"{parts.hostname} resolves to non-public address {ip}")
    return url


class RenderRequest(BaseModel):
    url: str


class DomControl(BaseModel):
    tag: str
    input_type: str
    name: str
    label: str
    accept: str = ""
    required: bool = False


class RenderResult(BaseModel):
    final_url: str
    title: str | None
    html: str
    controls: list[DomControl] = Field(default_factory=list)
    retrieved_at: datetime


def _profile(user_data_dir: str) -> BrowserProfile:
    storage_state = os.environ.get("ARTRAT_GOOGLE_STORAGE_STATE") or None
    return BrowserProfile(
        headless=True,
        user_data_dir=user_data_dir,
        storage_state=storage_state if storage_state and os.path.exists(storage_state) else None,
        executable_path=os.environ.get("ARTRAT_BROWSER_EXECUTABLE") or None,
        block_ip_addresses=True,  # no navigation to raw IPs, so redirects cannot reach internal hosts
        captcha_solver=True,
        enable_default_extensions=False,
        accept_downloads=False,
        auto_download_pdfs=True,
        downloads_path=os.path.join(user_data_dir, "downloads"),  # deleted with the profile
        highlight_elements=False,
        keep_alive=False,
    )


def _unwrap_google_continue_url(final_url: str) -> str:
    """When a Google Form with file-upload fields redirects an unauthenticated session to
    accounts.google.com/v3/signin/identifier?continue=<form_url>, extract the canonical form URL."""
    parts = urlsplit(final_url)
    if parts.hostname and parts.hostname.endswith("accounts.google.com"):
        qs = parse_qs(parts.query)
        for key in ("continue", "followup"):
            if qs.get(key):
                candidate = unquote(qs[key][0])
                if candidate.startswith("https://docs.google.com/forms/"):
                    return candidate.split("?")[0]
    return final_url


async def _remove_profile(path: str) -> None:
    """The browser can hold profile files briefly after it exits (Windows). Retry, then give up
    loudly rather than leave a profile behind silently."""
    for _ in range(20):
        shutil.rmtree(path, ignore_errors=True)
        if not os.path.exists(path):
            return
        await asyncio.sleep(0.25)
    raise RuntimeError(f"could not delete browser profile {path}")


async def render(url: str, *, include_controls: bool = False) -> RenderResult:
    assert_public_http_url(url)
    user_data_dir = tempfile.mkdtemp(prefix="artrat-browser-")
    try:
        session = BrowserSession(browser_profile=_profile(user_data_dir))
        try:
            await session.start()
            await session.navigate_to(url)
            page = await session.must_get_current_page()
            raw_final_url = await session.get_current_page_url()
            assert_public_http_url(raw_final_url)
            final_url = _unwrap_google_continue_url(raw_final_url)
            assert_public_http_url(final_url)
            html = await page.evaluate("() => document.documentElement.outerHTML")
            title = await session.get_current_page_title()
            raw_controls = await page.evaluate(DOM_CONTROLS_JS) if include_controls else []
        finally:
            await session.kill()
    finally:
        await _remove_profile(user_data_dir)
    if isinstance(raw_controls, str):
        try:
            raw_controls = json.loads(raw_controls)
        except json.JSONDecodeError:
            raw_controls = []
    controls = [DomControl.model_validate(c) for c in (raw_controls or [])]
    return RenderResult(
        final_url=final_url,
        title=title or None,
        html=html,
        controls=controls,
        retrieved_at=datetime.now(UTC),
    )


app = FastAPI(title="Artrat browser worker", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/render", response_model=RenderResult)
async def render_endpoint(req: RenderRequest) -> RenderResult:
    try:
        return await render(req.url)
    except BlockedUrl as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/inspect", response_model=RenderResult)
async def inspect_endpoint(req: RenderRequest) -> RenderResult:
    """Dry-run portal inspection via browser-use: returns rendered DOM HTML + form controls."""
    try:
        return await render(req.url, include_controls=True)
    except BlockedUrl as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


def main() -> None:
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", "8090")))
