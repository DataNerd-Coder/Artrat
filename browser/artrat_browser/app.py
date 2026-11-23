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
    const itemWrap = el.closest('[role="listitem"], .form-group, .field');
    if (itemWrap) {
      const heading = itemWrap.querySelector('[role="heading"], label, .M7eMe');
      if (heading && heading.innerText.trim()) return heading.innerText.trim();
    }
    return el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.name || el.id || '';
  };
  const controls = Array.from(document.querySelectorAll('input, select, textarea')).map((el) => ({
    tag: el.tagName.toLowerCase(),
    input_type: (el.getAttribute('type') || (el.tagName === 'TEXTAREA' ? 'textarea' : 'text')).toLowerCase(),
    name: el.getAttribute('name') || el.getAttribute('id') || '',
    label: labelFor(el),
    accept: el.getAttribute('accept') || '',
    required: el.hasAttribute('required') || el.getAttribute('aria-required') === 'true',
  }));
  // Also capture Google Form / SPA question blocks that use custom ARIA widgets instead of <input>
  Array.from(document.querySelectorAll('[role="listitem"]')).forEach((item, idx) => {
    const heading = item.querySelector('[role="heading"], .M7eMe');
    if (!heading || !heading.innerText.trim()) return;
    const lbl = heading.innerText.trim();
    const hasFile = /upload|attach|file|pdf|document|result|letter|transcript|photo|id/i.test(item.innerText || '');
    controls.push({
      tag: 'div',
      input_type: hasFile ? 'file' : 'question',
      name: `question_${idx + 1}`,
      label: lbl,
      accept: '',
      required: item.innerText.includes('*'),
    });
  });
  return controls;
}"""

AUTO_AUTH_JS = """(creds) => {
  const setVal = (el, val) => {
    if (!el || !val) return false;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    if (setter) setter.call(el, val);
    else el.value = val;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  };
  const pwdInputs = Array.from(document.querySelectorAll('input[type="password"]')).filter(el => el.offsetParent !== null);
  const emailInput = document.querySelector('input[type="email"], input#identifierId, input[name*="email" i], input[name*="user" i], input[id*="email" i], input[id*="user" i]');
  if (!pwdInputs.length && !emailInput) return { acted: false, action: 'none' };

  if (emailInput) setVal(emailInput, creds.email);
  if (pwdInputs.length >= 1) setVal(pwdInputs[0], creds.password);
  if (pwdInputs.length >= 2) setVal(pwdInputs[1], creds.password);

  const firstInput = document.querySelector('input[name*="first" i], input[id*="first" i]');
  const lastInput = document.querySelector('input[name*="last" i], input[id*="last" i], input[name*="surname" i]');
  const phoneInput = document.querySelector('input[type="tel"], input[name*="mobile" i], input[name*="phone" i], input[id*="mobile" i]');
  if (firstInput) setVal(firstInput, creds.first_name);
  if (lastInput) setVal(lastInput, creds.last_name);
  if (phoneInput) setVal(phoneInput, creds.phone);

  const termsBox = document.querySelector('input[type="checkbox"][name*="term" i], input[type="checkbox"][id*="term" i], input[type="checkbox"][name*="accept" i]');
  if (termsBox && !termsBox.checked) termsBox.click();

  const submitBtn = document.querySelector(
    '#identifierNext, #passwordNext, button[type="submit"], input[type="submit"], button.login'
  ) || Array.from(document.querySelectorAll('button, a.btn, [role="button"]')).find(b =>
    /^(log\s*in|sign\s*in|next|continue|register|create\s*account)$/i.test((b.innerText || b.value || '').trim())
  );
  if (submitBtn) {
    submitBtn.click();
    return { acted: true, action: pwdInputs.length >= 2 ? 'submitted_registration' : 'submitted_login' };
  }
  return { acted: false, action: 'filled_only' };
}"""

CLICK_SAFE_NEXT_STEP_JS = """() => {
  // Never click final Submit buttons during a dry-run; only click Next / Continue / Tab panels
  const candidates = Array.from(document.querySelectorAll('button, [role="button"], a.nav-link, [role="tab"]'));
  for (const el of candidates) {
    const txt = (el.innerText || el.getAttribute('aria-label') || '').trim();
    if (!txt || /submit|finish|complete\s+application|declare|send|delete|cancel|log\s*out/i.test(txt)) continue;
    if (/^(next|continue|proceed|step\s*\d+|personal|academic|education|documents?|uploads?|requirements?)$/i.test(txt) && !el.dataset.artratVisited) {
      el.dataset.artratVisited = '1';
      el.click();
      return txt;
    }
  }
  return '';
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


def _parse_raw_controls(raw_controls: object) -> list[DomControl]:
    if isinstance(raw_controls, str):
        try:
            raw_controls = json.loads(raw_controls)
        except json.JSONDecodeError:
            raw_controls = []
    if not isinstance(raw_controls, list):
        return []
    out: list[DomControl] = []
    for item in raw_controls:
        if isinstance(item, dict):
            try:
                out.append(DomControl.model_validate(item))
            except Exception:
                continue
    return out


def _inspector_credentials() -> dict[str, str]:
    return {
        "email": os.environ.get("ARTRAT_INSPECTOR_EMAIL", "").strip(),
        "password": os.environ.get("ARTRAT_INSPECTOR_PASSWORD", "").strip(),
        "first_name": os.environ.get("ARTRAT_INSPECTOR_FIRST_NAME", "Artrat").strip(),
        "last_name": os.environ.get("ARTRAT_INSPECTOR_LAST_NAME", "Inspector").strip(),
        "phone": os.environ.get("ARTRAT_INSPECTOR_PHONE", "08030000000").strip(),
    }


async def render(url: str, *, include_controls: bool = False) -> RenderResult:
    assert_public_http_url(url)
    user_data_dir = tempfile.mkdtemp(prefix="artrat-browser-")
    collected_controls: list[DomControl] = []
    seen_control_keys: set[tuple[str, str, str]] = set()
    html_snapshots: list[str] = []

    def add_controls(new_ctrls: list[DomControl]) -> None:
        for c in new_ctrls:
            key = (c.tag, c.input_type, c.label or c.name)
            if key not in seen_control_keys:
                seen_control_keys.add(key)
                collected_controls.append(c)

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
            html_snapshots.append(html)
            title = await session.get_current_page_title()
            if include_controls:
                add_controls(_parse_raw_controls(await page.evaluate(DOM_CONTROLS_JS)))

                # If the dry-run encounters an auth screen (Login / Sign-In / Google OAuth) and
                # inspector credentials are configured, authenticate and walk into the form.
                creds = _inspector_credentials()
                if creds["email"] and creds["password"]:
                    for _ in range(2):
                        auth_res = await page.evaluate(AUTO_AUTH_JS, creds)
                        if isinstance(auth_res, str):
                            try:
                                auth_res = json.loads(auth_res)
                            except json.JSONDecodeError:
                                auth_res = {}
                        if not isinstance(auth_res, dict) or not auth_res.get("acted"):
                            break
                        await asyncio.sleep(1.5)
                        cur_url = await session.get_current_page_url()
                        assert_public_http_url(cur_url)
                        final_url = _unwrap_google_continue_url(cur_url)
                        step_html = await page.evaluate("() => document.documentElement.outerHTML")
                        if step_html not in html_snapshots:
                            html_snapshots.append(step_html)
                        add_controls(_parse_raw_controls(await page.evaluate(DOM_CONTROLS_JS)))

                # Walk through safe Next / Continue / Tab steps (never clicking final Submit)
                for _ in range(4):
                    clicked_step = await page.evaluate(CLICK_SAFE_NEXT_STEP_JS)
                    if not clicked_step:
                        break
                    await asyncio.sleep(0.8)
                    cur_url = await session.get_current_page_url()
                    assert_public_http_url(cur_url)
                    step_html = await page.evaluate("() => document.documentElement.outerHTML")
                    if step_html not in html_snapshots:
                        html_snapshots.append(step_html)
                    add_controls(_parse_raw_controls(await page.evaluate(DOM_CONTROLS_JS)))
        finally:
            await session.kill()
    finally:
        await _remove_profile(user_data_dir)
    combined_html = html_snapshots[-1] if len(html_snapshots) == 1 else "\n".join(html_snapshots)
    return RenderResult(
        final_url=final_url,
        title=title or None,
        html=combined_html,
        controls=collected_controls,
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
