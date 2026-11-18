"""Research Directions, Thompson-sampling adaptation, and priority scoring (docs/05 §3).

Every candidate task gets a score from explicit signals:
  priority = w_rel*relevance + w_nov*novelty + w_gap*evidence_gap + w_fresh*freshness_due
           + w_dem*demand + w_dir*direction_yield - w_cost*expected_cost - w_fail*failure_penalty

Research Directions are selected with a Beta-posterior Thompson sampler over verified-per-attempt
weighted by student demand and cost, so productive directions receive more crawl budget while
low-yield directions decay gracefully without starving exploration.
"""

import math
import random
import re
from datetime import UTC, datetime
from urllib.parse import urlsplit

from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from artrat.platform.config import Settings
from artrat.research.learning import match_learned_funding_cue
from artrat.research.links import FUNDING_TERMS
from artrat.research.tables import ResearchDirectionRow

DEFAULT_DIRECTIONS: tuple[tuple[str, str, str, float], ...] = (
    (
        "nigeria-undergrad-stem",
        "web",
        "Nigeria undergraduate STEM engineering scholarship 2026/2027 apply portal",
        1.0,
    ),
    (
        "nigeria-oil-gas-jv-trusts",
        "web",
        "NLNG NNPC TotalEnergies Seplat Agbami Chevron PTDF undergraduate scholarship 2026/2027",
        1.0,
    ),
    (
        "nigeria-orphan-indigent-disability",
        "web",
        "Nigeria scholarship bursary orphan fatherless indigent disability undergraduate 2026/2027",
        0.95,
    ),
    (
        "nigeria-state-lga-bursaries",
        "web",
        "Nigeria state scholarship board bursary award undergraduate portal 2026/2027",
        0.85,
    ),
    (
        "social-scholarship-announcements",
        "social",
        "site:linkedin.com OR site:x.com Nigerian undergraduate scholarship application portal 2026/2027",
        0.8,
    ),
    (
        "international-african-fellowships",
        "web",
        "Mastercard Foundation Chevening Commonwealth scholarship Nigerian students 2026/2027",
        0.9,
    ),
)


class ResearchDirectionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    slug: str
    channel: str
    query: str
    demand_weight: float
    attempts: int
    leads_found: int
    verified_opportunities: int
    expired_opportunities: int
    total_cost: float
    updated_at: datetime


def ensure_default_directions(session: Session) -> list[ResearchDirectionOut]:
    """Seed the default discovery directions idempotently."""
    now = datetime.now(UTC)
    for slug, channel, query, demand in DEFAULT_DIRECTIONS:
        session.execute(
            insert(ResearchDirectionRow)
            .values(
                slug=slug,
                channel=channel,
                query=query,
                demand_weight=demand,
                attempts=0,
                leads_found=0,
                verified_opportunities=0,
                expired_opportunities=0,
                total_cost=0.0,
                updated_at=now,
            )
            .on_conflict_do_nothing(index_elements=["slug"])
        )
    session.flush()
    return list_directions(session)


def list_directions(session: Session) -> list[ResearchDirectionOut]:
    rows = session.scalars(select(ResearchDirectionRow).order_by(ResearchDirectionRow.slug)).all()
    return [ResearchDirectionOut.model_validate(r) for r in rows]


def direction_yield_mean(row: ResearchDirectionRow | ResearchDirectionOut) -> float:
    """Posterior mean of verified yield per attempt in [0, 1]."""
    alpha = 1.0 + row.verified_opportunities + 0.25 * min(row.leads_found, 20)
    beta = (
        1.0
        + max(0, row.attempts - row.verified_opportunities)
        + 0.5 * row.expired_opportunities
    )
    return round(alpha / (alpha + beta), 4)


def _discounted_beta_params(
    row: ResearchDirectionRow | ResearchDirectionOut, now: datetime
) -> tuple[float, float]:
    """Non-stationary discounted Beta(alpha, beta) parameters so stale scholarship cycles decay
    gracefully while recently active directions retain full posterior sharpness."""
    updated = row.updated_at if row.updated_at.tzinfo else row.updated_at.replace(tzinfo=UTC)
    age_days = max(0.0, (now - updated).total_seconds() / 86400.0)
    gamma = math.exp(-0.02 * min(age_days, 90.0))
    alpha = 1.0 + gamma * (row.verified_opportunities + 0.25 * min(row.leads_found, 20))
    beta = 1.0 + gamma * (
        max(0, row.attempts - row.verified_opportunities) + 0.5 * row.expired_opportunities
    )
    return alpha, beta


def _ucb1_score(row: ResearchDirectionRow, total_attempts: int, mean_yield: float) -> float:
    """UCB1 / KL-UCB upper confidence bound for deterministic exploration of under-sampled arms."""
    n_d = max(1, row.attempts)
    bonus = 0.12 * math.sqrt(2.0 * math.log(max(2, total_attempts + 2)) / (n_d + 1.0))
    return min(1.2, mean_yield + bonus)


def _linucb_contextual_score(row: ResearchDirectionRow, mean_yield: float, now: datetime) -> float:
    """Contextual Ridge / LinUCB score over [yield, demand, lead_density, freshness, cost_efficiency]."""
    updated = row.updated_at if row.updated_at.tzinfo else row.updated_at.replace(tzinfo=UTC)
    age_days = max(0.0, (now - updated).total_seconds() / 86400.0)
    freshness = math.exp(-0.05 * min(age_days, 60.0))
    lead_density = min(1.0, row.leads_found / max(1.0, 5.0 * max(1, row.attempts)))
    cost_eff = 1.0 / (1.0 + 0.05 * row.total_cost)
    x = (mean_yield, row.demand_weight, lead_density, freshness, cost_eff)
    theta = (0.55, 0.15, 0.15, 0.05, 0.10)
    linear_pred = sum(w * f for w, f in zip(theta, x, strict=True))
    ridge_uncertainty = 0.08 * math.sqrt(sum(f * f for f in x) / (row.attempts + 2.0))
    return min(1.2, linear_pred + ridge_uncertainty)


def _boltzmann_gumbel_score(
    mean_yield: float, total_attempts: int, sampler: random.Random | object
) -> float:
    """Entropy-regularized Boltzmann / Gumbel-Max exploration with annealing temperature."""
    temp = 0.08 / math.sqrt(1.0 + math.log(2.0 + total_attempts))
    u = max(1e-6, min(1.0 - 1e-6, sampler.random()))  # type: ignore[attr-defined]
    gumbel = max(-1.5, min(2.0, -math.log(-math.log(u))))
    return max(0.0, min(1.2, mean_yield + temp * gumbel))


def choose_directions(
    session: Session,
    count: int = 3,
    *,
    rng: random.Random | None = None,
) -> list[ResearchDirectionOut]:
    """Select `count` directions using a 4-strategy statistical ensemble:
    1. Discounted Non-Stationary Thompson Sampling (50%)
    2. UCB1 Upper Confidence Bound (20%)
    3. Contextual Ridge / LinUCB (20%)
    4. Boltzmann / Gumbel-Softmax Exploration (10%)
    """
    ensure_default_directions(session)
    rows = session.scalars(select(ResearchDirectionRow)).all()
    sampler = rng or random
    now = datetime.now(UTC)
    total_attempts = sum(max(0, r.attempts) for r in rows)
    scored: list[tuple[float, ResearchDirectionRow]] = []
    for row in rows:
        alpha, beta = _discounted_beta_params(row, now)
        mean_yield = alpha / (alpha + beta)
        ts_draw = sampler.betavariate(alpha, beta)
        ucb_val = _ucb1_score(row, total_attempts, mean_yield)
        linucb_val = _linucb_contextual_score(row, mean_yield, now)
        boltzmann_val = _boltzmann_gumbel_score(mean_yield, total_attempts, sampler)

        ensemble = (
            0.50 * ts_draw
            + 0.20 * ucb_val
            + 0.20 * linucb_val
            + 0.10 * boltzmann_val
        )
        cost_factor = 1.0 / (1.0 + 0.05 * row.total_cost)
        scored.append((ensemble * row.demand_weight * cost_factor, row))
    scored.sort(key=lambda pair: pair[0], reverse=True)
    return [ResearchDirectionOut.model_validate(r) for _, r in scored[: max(1, count)]]


def evolve_direction_from_discovery(
    session: Session,
    *,
    title: str,
    official_url: str,
    demand_weight: float = 0.9,
) -> str | None:
    """Autonomously synthesize and register a new ResearchDirection arm when a verified
    scholarship reveals a productive new sponsor domain or program family."""
    host = (urlsplit(official_url).hostname or "").lower().removeprefix("www.")
    if not host or any(
        agg in host for agg in ("icanstudent", "scholarshipregion", "scholarsregion", "google.com")
    ):
        return None
    domain_token = host.split(".")[0]
    if len(domain_token) < 3:
        return None
    slug = re.sub(r"[^a-z0-9]+", "-", f"evolved-{domain_token}-scholarships").strip("-")[:110]
    clean_title = re.sub(r"[^a-zA-Z0-9\s]+", " ", title).strip()
    words = [w for w in clean_title.split() if len(w) >= 3][:6]
    if not words:
        return None
    query = f"{' '.join(words)} {host} scholarship application portal"
    now = datetime.now(UTC)
    session.execute(
        insert(ResearchDirectionRow)
        .values(
            slug=slug,
            channel="web_evolved",
            query=query,
            demand_weight=demand_weight,
            attempts=1,
            leads_found=1,
            verified_opportunities=1,
            expired_opportunities=0,
            total_cost=0.05,
            updated_at=now,
        )
        .on_conflict_do_nothing(index_elements=["slug"])
    )
    session.flush()
    return slug


def record_direction_outcome(
    session: Session,
    slug: str,
    *,
    attempts_delta: int = 0,
    leads_delta: int = 0,
    verified_delta: int = 0,
    expired_delta: int = 0,
    cost_delta: float = 0.0,
) -> None:
    row = session.get(ResearchDirectionRow, slug)
    if row is None:
        return
    row.attempts += attempts_delta
    row.leads_found += leads_delta
    row.verified_opportunities += verified_delta
    row.expired_opportunities += expired_delta
    row.total_cost = round(row.total_cost + cost_delta, 4)
    row.updated_at = datetime.now(UTC)
    session.flush()


def relevance_of_text(text: str) -> float:
    """Fraction of scholarship/application signals present in a title + snippet, in [0.1, 1.0]."""
    low = text.lower()
    hits = sum(1 for term in FUNDING_TERMS if term in low)
    _, learned_weight = match_learned_funding_cue(low)
    bonus = 0.25 if any(k in low for k in ("apply", "deadline", "eligibility", "undergraduate", "portal")) else 0.0
    return round(min(1.0, max(0.1, 0.25 * hits + 0.2 * learned_weight + bonus)), 4)


def score_priority(
    settings: Settings,
    *,
    relevance: float = 0.5,
    novelty: float = 1.0,
    evidence_gap: float = 0.5,
    freshness_due: float = 0.0,
    demand: float = 0.8,
    direction_yield: float = 0.5,
    expected_cost: float = 0.1,
    failure_penalty: float = 0.0,
) -> tuple[float, dict[str, float]]:
    """Compute task priority and the signal breakdown recorded in ResearchTaskRow.reason."""
    signals = {
        "relevance": round(relevance, 4),
        "novelty": round(novelty, 4),
        "evidence_gap": round(evidence_gap, 4),
        "freshness_due": round(freshness_due, 4),
        "demand": round(demand, 4),
        "direction_yield": round(direction_yield, 4),
        "expected_cost": round(expected_cost, 4),
        "failure_penalty": round(failure_penalty, 4),
    }
    raw = (
        settings.w_relevance * relevance
        + settings.w_novelty * novelty
        + settings.w_evidence_gap * evidence_gap
        + settings.w_freshness_due * freshness_due
        + settings.w_demand * demand
        + settings.w_direction_yield * direction_yield
        - settings.w_expected_cost * expected_cost
        - settings.w_failure_penalty * failure_penalty
    )
    return round(max(0.05, raw), 4), signals
