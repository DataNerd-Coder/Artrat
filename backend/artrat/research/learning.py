"""Self-learning empirical Bayesian signal registry for anchor phrases, funding cues,
and third-party aggregator domains.

Instead of relying on static keyword lists (like only checking for 'apply now'), Artrat
continuously updates Beta(alpha, beta) posteriors and UCB confidence bounds over anchor n-grams,
URL path tokens, funding cues, and aggregator domains as it crawls and verifies portals.
"""

import math
import re
import uuid
from datetime import UTC, datetime
from urllib.parse import urlsplit

from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from artrat.research.tables import LearnedSignalRow

SEED_APPLY_ANCHORS: tuple[str, ...] = (
    "apply now",
    "apply here",
    "click here to apply",
    "application form",
    "online application",
    "application portal",
    "official page",
    "official website",
    "read how to apply",
    "start your application",
    "begin application",
    "proceed to apply",
    "candidate portal",
    "register now",
    "submit application",
    "fill application form",
    "commence application",
    "enrol now",
    "scholarship portal",
)

SEED_FUNDING_CUES: tuple[str, ...] = (
    "scholarship",
    "bursary",
    "fellowship",
    "grant",
    "studentship",
    "award",
    "tuition waiver",
    "assistantship",
    "stipend",
    "financial aid",
    "endowment",
    "undergraduate support",
)

SEED_AGGREGATOR_HOSTS: tuple[str, ...] = (
    "icanstudent.com",
    "scholarshipregion.com",
    "scholarsregion.com",
    "myschoolgist.com",
    "afterschoolafrica.com",
    "opportunitiesforafricans.com",
    "scholarsworld.ng",
    "scholarshipright.com",
    "brainsbeyondboders.org",
    "prideriseglobal.com",
)

URL_ACTION_TOKENS: tuple[str, ...] = (
    "forms.gle",
    "docs.google.com/forms",
    "/apply",
    "/register",
    "/candidate",
    "/schemes/",
    "application",
    "portal.",
    "apply.",
    ".docm",
    ".docx",
)

STOPWORDS = frozenset(
    {
        "the", "and", "for", "with", "from", "that", "this", "your", "you", "are",
        "our", "more", "about", "home", "page", "menu", "skip", "main", "content",
        "privacy", "policy", "terms", "cookies", "share", "save", "facebook",
        "twitter", "linkedin", "whatsapp", "instagram", "youtube", "contact",
    }
)

# Live in-memory mirror synced with Postgres `learned_signal` so hot-path HTML parsing
# (`parse_page` / `follow_candidates`) benefits immediately from newly learned phrases.
_LIVE_APPLY_WEIGHTS: dict[str, tuple[float, float]] = {
    phrase: (3.0, 1.0) for phrase in SEED_APPLY_ANCHORS
}
_LIVE_FUNDING_WEIGHTS: dict[str, tuple[float, float]] = {
    phrase: (3.0, 1.0) for phrase in SEED_FUNDING_CUES
}
_LIVE_AGGREGATOR_HOSTS: set[str] = set(SEED_AGGREGATOR_HOSTS)


class LearnedSignalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    category: str
    phrase: str
    alpha: float
    beta: float
    observations: int
    empirical_weight: float
    updated_at: datetime


def _posterior_ucb_weight(alpha: float, beta: float) -> float:
    total = max(1.0, alpha + beta)
    mean = alpha / total
    ucb = 0.25 * math.sqrt(math.log(total + 2.0) / total)
    return round(min(1.0, mean + ucb), 4)


def normalize_phrase(raw: str) -> str:
    cleaned = re.sub(r"[^a-z0-9\s./_-]+", " ", raw.lower())
    return " ".join(cleaned.split())[:180]


def extract_candidate_ngrams(anchor: str) -> list[str]:
    norm = normalize_phrase(anchor)
    words = [w for w in norm.split() if len(w) >= 3 and w not in STOPWORDS]
    if not words:
        return []
    ngrams: list[str] = []
    if 1 <= len(words) <= 5:
        ngrams.append(" ".join(words))
    for n in (2, 3):
        for i in range(len(words) - n + 1):
            ngrams.append(" ".join(words[i : i + n]))
    return list(dict.fromkeys(ngrams))


def score_apply_anchor(anchor: str, href: str = "") -> float:
    """Return a continuous self-learned probability score in [0.0, 1.0] that an `<a href>`
    is an application / portal entry link."""
    low_anchor = normalize_phrase(anchor)
    low_href = href.lower()
    best = 0.0

    for phrase, (alpha, beta) in _LIVE_APPLY_WEIGHTS.items():
        if phrase and phrase in low_anchor:
            best = max(best, _posterior_ucb_weight(alpha, beta))

    for token in URL_ACTION_TOKENS:
        if token in low_href:
            best = max(best, 0.78 if low_anchor else 0.65)

    # Contextual action-verb + target-noun composition (generalizes beyond exact seed strings)
    verbs = ("apply", "start", "begin", "proceed", "submit", "register", "launch", "open", "fill", "complete", "download")
    nouns = ("application", "portal", "form", "registration", "candidate", "scholarship", "scheme", "admission", "entry")
    if any(v in low_anchor for v in verbs) and any(n in low_anchor or n in low_href for n in nouns):
        best = max(best, 0.82)

    return round(best, 4)


def is_learned_apply_anchor(anchor: str, href: str = "", *, threshold: float = 0.68) -> bool:
    return score_apply_anchor(anchor, href) >= threshold


def match_learned_funding_cue(text: str) -> tuple[str | None, float]:
    """Return `(matched_phrase, weight)` for the strongest learned funding cue in `text`."""
    low = normalize_phrase(text)
    best_phrase: str | None = None
    best_weight = 0.0
    for phrase, (alpha, beta) in _LIVE_FUNDING_WEIGHTS.items():
        if phrase in low:
            w = _posterior_ucb_weight(alpha, beta)
            if w > best_weight:
                best_weight = w
                best_phrase = phrase
    return best_phrase, best_weight


def is_learned_aggregator_url(url: str) -> bool:
    host = (urlsplit(url).hostname or url).lower().removeprefix("www.")
    return any(host == agg or host.endswith(f".{agg}") for agg in _LIVE_AGGREGATOR_HOSTS)


def sync_learned_signals_from_db(session: Session) -> list[LearnedSignalOut]:
    rows = session.scalars(select(LearnedSignalRow)).all()
    out: list[LearnedSignalOut] = []
    for r in rows:
        if r.category == "apply_anchor":
            _LIVE_APPLY_WEIGHTS[r.phrase] = (r.alpha, r.beta)
        elif r.category == "funding_cue":
            _LIVE_FUNDING_WEIGHTS[r.phrase] = (r.alpha, r.beta)
        elif r.category == "aggregator_host" and r.alpha > r.beta:
            _LIVE_AGGREGATOR_HOSTS.add(r.phrase)
        out.append(
            LearnedSignalOut(
                category=r.category,
                phrase=r.phrase,
                alpha=r.alpha,
                beta=r.beta,
                observations=r.observations,
                empirical_weight=_posterior_ucb_weight(r.alpha, r.beta),
                updated_at=r.updated_at,
            )
        )
    return out


def record_signal_feedback(
    session: Session,
    category: str,
    phrase: str,
    *,
    alpha_delta: float = 0.0,
    beta_delta: float = 0.0,
) -> None:
    norm = normalize_phrase(phrase) if category != "aggregator_host" else phrase.strip().lower().removeprefix("www.")
    if not norm or len(norm) < 3:
        return
    now = datetime.now(UTC)
    stmt = (
        insert(LearnedSignalRow)
        .values(
            id=uuid.uuid4(),
            category=category,
            phrase=norm[:200],
            alpha=max(0.5, 1.5 + alpha_delta),
            beta=max(0.5, 1.0 + beta_delta),
            observations=1,
            updated_at=now,
        )
        .on_conflict_do_update(
            constraint="uq_learned_signal_category_phrase",
            set_={
                "alpha": LearnedSignalRow.alpha + alpha_delta,
                "beta": LearnedSignalRow.beta + beta_delta,
                "observations": LearnedSignalRow.observations + 1,
                "updated_at": now,
            },
        )
    )
    session.execute(stmt)
    session.flush()

    if category == "apply_anchor":
        cur_a, cur_b = _LIVE_APPLY_WEIGHTS.get(norm, (1.5, 1.0))
        _LIVE_APPLY_WEIGHTS[norm] = (cur_a + alpha_delta, cur_b + beta_delta)
    elif category == "funding_cue":
        cur_a, cur_b = _LIVE_FUNDING_WEIGHTS.get(norm, (1.5, 1.0))
        _LIVE_FUNDING_WEIGHTS[norm] = (cur_a + alpha_delta, cur_b + beta_delta)
    elif category == "aggregator_host" and alpha_delta > 0:
        _LIVE_AGGREGATOR_HOSTS.add(norm)


def learn_from_crawl_outcome(
    session: Session,
    *,
    source_url: str,
    links: list[tuple[str, str]],
    chosen_target_url: str | None = None,
    yielded_opportunity: bool = False,
    is_aggregator_blog: bool = False,
    ai_discovered_phrases: list[str] | None = None,
) -> None:
    """Update Artrat's self-learning signal store from a live crawl or portal hop outcome."""
    if is_aggregator_blog:
        host = (urlsplit(source_url).hostname or "").lower().removeprefix("www.")
        if host:
            record_signal_feedback(session, "aggregator_host", host, alpha_delta=2.0)

    if chosen_target_url:
        for anchor, href in links:
            if href == chosen_target_url and anchor.strip():
                for ngram in extract_candidate_ngrams(anchor)[:3]:
                    record_signal_feedback(session, "apply_anchor", ngram, alpha_delta=1.2)

    if yielded_opportunity:
        for anchor, href in links[:30]:
            if is_learned_apply_anchor(anchor, href):
                for ngram in extract_candidate_ngrams(anchor)[:2]:
                    record_signal_feedback(session, "apply_anchor", ngram, alpha_delta=0.6)

    for phrase in ai_discovered_phrases or []:
        record_signal_feedback(session, "apply_anchor", phrase, alpha_delta=1.0)
