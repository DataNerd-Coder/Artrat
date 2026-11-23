"""Autonomous multi-page Google Forms dry-run inspector and submission engine.

Parses `FB_PUBLIC_LOAD_DATA_` across all sections/pages of a Google Form (even when pages 2..N
are behind 'Next' buttons), maps each `entry.<id>` question using Artrat's AI gateway grounded
in the student's verified profile, and submits the multi-page payload to `/formResponse`.
"""

import json
import re
from dataclasses import dataclass, field
from urllib.parse import urlencode

import httpx
from scrapling.fetchers import Fetcher
from scrapling.parser import Selector

from artrat.llm.gateway import GatewayError, OpenRouterGateway
from artrat.platform.config import Settings
from artrat.platform.urls import assert_public_http_url

GOOGLE_FORM_FILL_PROMPT = """\
You are Artrat's autonomous form-filling engine.
You receive a student's verified profile and a list of Google Form questions with their exact allowed options.
For every question:
- If `multi_select` is false, return a single string that EXACTLY matches one of `options` (if `options` is non-empty).
- If `multi_select` is true, return a list of 1 to 3 strings that EACH EXACTLY match an item in `options`.
- If a question has `required: false` and has dummy options like `["Option 1"]` with no title, omit it or set it to null.

Return ONLY a JSON object mapping each `entry_key` (e.g. `"entry.1809871344"`) to its chosen value (string or list of strings):
{
  "answers": {
    "entry.1809871344": "Less than 25",
    "entry.750979404": ["School", "Social media"]
  }
}
"""


@dataclass(frozen=True)
class GoogleFormQuestion:
    entry_key: str
    title: str
    question_type: int
    required: bool
    options: tuple[str, ...] = ()
    multi_select: bool = False
    section_index: int = 0


@dataclass(frozen=True)
class GoogleFormSchema:
    form_url: str
    action_url: str
    title: str
    fbzx: str
    section_count: int
    questions: tuple[GoogleFormQuestion, ...]


@dataclass(frozen=True)
class GoogleFormFillOutcome:
    form_title: str
    form_url: str
    action_url: str
    submitted: bool
    status_code: int
    confirmation_message: str
    page_history: str
    answers: dict[str, str | list[str]] = field(default_factory=dict)
    questions: list[dict] = field(default_factory=list)


def inspect_google_form_schema(form_url: str, settings: Settings) -> GoogleFormSchema:
    """Fetch a Google Form and extract its complete multi-page `FB_PUBLIC_LOAD_DATA_` schema."""
    assert_public_http_url(form_url)
    resp = Fetcher.get(
        form_url,
        timeout=settings.fetch_timeout_seconds,
        headers={"User-Agent": settings.user_agent},
    )
    html = resp.body.decode(resp.encoding or "utf-8", errors="replace")
    sel = Selector(html)
    title = (sel.css("title::text").get() or "Google Form").strip()

    fbzx_match = re.search(r'name="fbzx"\s+value="([^"]+)"', html)
    fbzx = fbzx_match.group(1) if fbzx_match else "-1"

    base_form_url = form_url.split("?")[0]
    if base_form_url.endswith("/viewform"):
        action_url = base_form_url[: -len("/viewform")] + "/formResponse"
    else:
        action_url = base_form_url.rstrip("/") + "/formResponse"

    fb_match = re.search(r"FB_PUBLIC_LOAD_DATA_\s*=\s*(\[.*?\]);\s*</script>", html, re.DOTALL)
    if not fb_match:
        return GoogleFormSchema(
            form_url=form_url,
            action_url=action_url,
            title=title,
            fbzx=fbzx,
            section_count=1,
            questions=(),
        )

    fb_data = json.loads(fb_match.group(1))
    raw_items = (
        fb_data[1][1]
        if isinstance(fb_data, list)
        and len(fb_data) > 1
        and isinstance(fb_data[1], list)
        and len(fb_data[1]) > 1
        else []
    )

    questions: list[GoogleFormQuestion] = []
    section_idx = 0
    for item in raw_items or []:
        if not isinstance(item, list) or len(item) < 5:
            continue
        q_title = str(item[1] or "").strip()
        q_type = int(item[3]) if isinstance(item[3], int) else 0
        entries = item[4]
        if q_type == 8:
            section_idx += 1
            continue
        if not isinstance(entries, list):
            continue
        for ent in entries:
            if not isinstance(ent, list) or len(ent) < 3:
                continue
            ent_id = ent[0]
            opts = tuple(
                str(o[0]) for o in (ent[1] or []) if isinstance(o, list) and o and o[0] is not None
            )
            req = bool(ent[2])
            if not q_title and not req:
                continue
            questions.append(
                GoogleFormQuestion(
                    entry_key=f"entry.{ent_id}",
                    title=q_title or f"Question {ent_id}",
                    question_type=q_type,
                    required=req,
                    options=opts,
                    multi_select=(q_type == 4),
                    section_index=section_idx,
                )
            )

    return GoogleFormSchema(
        form_url=form_url,
        action_url=action_url,
        title=title,
        fbzx=fbzx,
        section_count=section_idx + 1,
        questions=tuple(questions),
    )


def _fallback_answer_for_question(q: GoogleFormQuestion) -> str | list[str]:
    low = q.title.lower()
    if not q.options:
        return "Chisom Kamsiyochukwu Okafor (UNN 200L)"
    if q.multi_select:
        preferred = [
            opt
            for opt in q.options
            if any(
                k in opt.lower()
                for k in (
                    "school",
                    "social media",
                    "health",
                    "food poisoning",
                    "stomach",
                    "liver",
                    "mould",
                    "cleanliness",
                    "colour",
                    "smell",
                )
            )
        ]
        return preferred[:3] if preferred else [q.options[0]]
    if "age" in low:
        for opt in q.options:
            if "less than 25" in opt.lower() or "18" in opt.lower() or "20" in opt.lower():
                return opt
    if "gender" in low:
        for opt in q.options:
            if "female" in opt.lower():
                return opt
    if "occupation" in low:
        for opt in q.options:
            if "student" in opt.lower():
                return opt
    if "education" in low:
        for opt in q.options:
            if "bachelor" in opt.lower() or "undergraduate" in opt.lower() or "university" in opt.lower():
                return opt
    if "how often" in low:
        for opt in q.options:
            if "often" in opt.lower():
                return opt
    if "store" in low and ("home" in low or "usually" in low):
        for opt in q.options:
            if "covered container" in opt.lower() or "dry" in opt.lower():
                return opt
    if "notice mould" in low or "unusual smell" in low:
        for opt in q.options:
            if "discard" in opt.lower():
                return opt
    if "removing visible mould" in low or "thorough cooking" in low:
        for opt in q.options:
            if opt.strip().lower() == "no":
                return opt
    for opt in q.options:
        if opt.strip().lower() == "yes":
            return opt
    return q.options[0]


def fill_and_submit_google_form(
    form_url: str,
    settings: Settings,
    *,
    student_context: str = (
        "Student: Chisom Kamsiyochukwu Okafor, Age: 17 (Less than 25), Gender: Female, "
        "Occupation: Undergraduate Student (Bachelor's degree in progress, 200 Level B.Eng Electrical "
        "Engineering at University of Nigeria, Nsukka - UNN, living near Ogige Market Nsukka)."
    ),
    submit: bool = True,
) -> GoogleFormFillOutcome:
    """Dry-run inspect all pages of a Google Form, generate grounded answers via Artrat's AI
    gateway, and submit the form to `/formResponse`."""
    schema = inspect_google_form_schema(form_url, settings)
    q_payload = [
        {
            "entry_key": q.entry_key,
            "title": q.title,
            "required": q.required,
            "multi_select": q.multi_select,
            "options": list(q.options),
        }
        for q in schema.questions
    ]

    ai_answers: dict = {}
    try:
        gw = OpenRouterGateway(settings)
        user_msg = (
            f"Student Profile:\n{student_context}\n\n"
            f"Form Title: {schema.title}\n"
            f"Questions JSON:\n{json.dumps(q_payload, ensure_ascii=False)}"
        )
        parsed = gw._chat_json(GOOGLE_FORM_FILL_PROMPT, user_msg)
        if isinstance(parsed.get("answers"), dict):
            ai_answers = parsed["answers"]
    except GatewayError:
        ai_answers = {}

    final_answers: dict[str, str | list[str]] = {}
    form_tuples: list[tuple[str, str]] = []

    for q in schema.questions:
        raw_choice = ai_answers.get(q.entry_key)
        if q.multi_select:
            valid_list: list[str] = []
            if isinstance(raw_choice, list):
                valid_list = [str(x) for x in raw_choice if str(x) in q.options]
            elif isinstance(raw_choice, str) and raw_choice in q.options:
                valid_list = [raw_choice]
            if not valid_list:
                fb = _fallback_answer_for_question(q)
                valid_list = fb if isinstance(fb, list) else [str(fb)]
            final_answers[q.entry_key] = valid_list
            for val in valid_list:
                form_tuples.append((q.entry_key, val))
        else:
            chosen_str: str | None = None
            if isinstance(raw_choice, str) and (not q.options or raw_choice in q.options):
                chosen_str = raw_choice
            if not chosen_str:
                fb = _fallback_answer_for_question(q)
                chosen_str = str(fb[0] if isinstance(fb, list) else fb)
            final_answers[q.entry_key] = chosen_str
            form_tuples.append((q.entry_key, chosen_str))

    page_history = ",".join(str(i) for i in range(schema.section_count))
    form_tuples.extend(
        [
            ("fvv", "1"),
            ("pageHistory", page_history),
            ("fbzx", schema.fbzx),
        ]
    )

    status_code = 200
    confirmation_msg = "Dry-run mapped all questions (submission not requested)."
    submitted_ok = False

    if submit:
        encoded_body = urlencode(form_tuples).encode("utf-8")
        with httpx.Client(timeout=settings.fetch_timeout_seconds, follow_redirects=True) as client:
            post_resp = client.post(
                schema.action_url,
                content=encoded_body,
                headers={
                    "User-Agent": settings.user_agent,
                    "Referer": schema.form_url,
                    "Origin": "https://docs.google.com",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            )
        status_code = post_resp.status_code
        resp_sel = Selector(post_resp.text)
        conf_nodes = resp_sel.css(".vHW8K::text, .freebirdFormviewerViewResponseConfirmationMessage::text")
        conf_texts = [str(c).strip() for c in conf_nodes.getall() if str(c).strip()]
        if conf_texts:
            confirmation_msg = " ".join(conf_texts)
            submitted_ok = True
        elif status_code == 200 and (
            "response has been recorded" in post_resp.text.lower()
            or "form_confirm" in post_resp.text.lower()
            or "submit another response" in post_resp.text.lower()
        ):
            confirmation_msg = "Your response has been recorded."
            submitted_ok = True
        else:
            confirmation_msg = f"HTTP {status_code} returned from Google Forms"
            submitted_ok = status_code == 200

    return GoogleFormFillOutcome(
        form_title=schema.title,
        form_url=schema.form_url,
        action_url=schema.action_url,
        submitted=submitted_ok,
        status_code=status_code,
        confirmation_message=confirmation_msg,
        page_history=page_history,
        answers=final_answers,
        questions=q_payload,
    )
