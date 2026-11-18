"""The discovery agent loop: plan search directions with Thompson sampling, query SearXNG,
crawl pages with Scrapling and browser-use, extract Opportunities, dry-run inspect portals,
and check live university semester states."""

import logging
import random
import time
import uuid
from collections.abc import Callable
from dataclasses import dataclass

from sqlalchemy.orm import Session

from artrat.catalogue import api as catalogue
from artrat.llm.gateway import OpenRouterGateway
from artrat.platform.config import Settings
from artrat.platform.db import session_scope
from artrat.platform.urls import BlockedUrl, assert_public_http_url
from artrat.research import frontier
from artrat.research.directions import (
    choose_directions,
    direction_yield_mean,
    record_direction_outcome,
    relevance_of_text,
    score_priority,
)
from artrat.research.extract import Proposer, default_propose, extract_from_source
from artrat.research.fetch import FetchFailed, Retrieved, fetch_rendered, fetch_static, http_get
from artrat.research.links import canonical_url, follow_candidates, resolve_dropped_link
from artrat.research.portal import inspect_portal_snapshot
from artrat.research.robots import RobotsCache
from artrat.research.search import Searcher, searxng_search
from artrat.research.semester import parse_university_semester
from artrat.research.tables import ResearchDirectionRow, TaskKind

log = logging.getLogger("artrat.agent")

CHILD_PRIORITY_DECAY = 0.8
LINK_DROP_PRIORITY = 10.0

Fetch = Callable[..., Retrieved]


@dataclass
class Runtime:
    settings: Settings
    robots: RobotsCache
    guard: Callable[[str], str] = assert_public_http_url
    static: Fetch = fetch_static
    rendered: Fetch = fetch_rendered
    proposer: Proposer = default_propose
    search: Searcher = searxng_search


def default_runtime(settings: Settings) -> Runtime:
    gateway = OpenRouterGateway(settings)

    def get_robots(url: str) -> tuple[int, str]:
        _, status, body = http_get(url, settings)
        return status, body

    return Runtime(
        settings=settings,
        robots=RobotsCache(get_robots, settings.robots_agent),
        proposer=gateway.propose,
    )


def seed(rt: Runtime, urls: list[str]) -> int:
    with session_scope() as session:
        return sum(
            frontier.enqueue(
                session, TaskKind.FETCH, url, depth=0, priority=1.0,
                reason={"seed": True}, settings=rt.settings,
            )
            for url in urls
        )


def drop_link(rt: Runtime, url: str) -> bool:
    """Student link-drop enrichment (docs/05 §1.4): high-priority immediate crawl.
    Supports full URLs, bare domains ('icanstudent.com'), and extensionless names ('scholarshipregion')."""
    resolved = resolve_dropped_link(url, guard=rt.guard)
    with session_scope() as session:
        return frontier.enqueue(
            session,
            TaskKind.FETCH,
            resolved,
            depth=0,
            priority=LINK_DROP_PRIORITY,
            reason={"link_drop": True, "raw_input": url},
            settings=rt.settings,
        )


def plan_searches(
    rt: Runtime,
    count: int = 3,
    *,
    rng: random.Random | None = None,
) -> list[str]:
    """Select `count` ResearchDirections via Thompson sampling and enqueue SEARCH tasks."""
    queued_slugs: list[str] = []
    with session_scope() as session:
        chosen = choose_directions(session, count=count, rng=rng)
        for direction in chosen:
            yld = direction_yield_mean(direction)
            prio, signals = score_priority(
                rt.settings,
                relevance=0.8,
                novelty=1.0,
                demand=direction.demand_weight,
                direction_yield=yld,
                expected_cost=0.05,
            )
            synthetic_url = f"https://searxng.internal/search?direction={direction.slug}"
            attempt_key = f"{direction.slug}:{direction.attempts + 1}"
            if frontier.enqueue(
                session,
                TaskKind.SEARCH,
                synthetic_url,
                depth=0,
                priority=prio,
                reason={"direction": direction.slug, "signals": signals},
                settings=rt.settings,
                key=attempt_key,
                payload={
                    "direction_slug": direction.slug,
                    "query": direction.query,
                    "demand_weight": direction.demand_weight,
                },
            ):
                queued_slugs.append(direction.slug)
    return queued_slugs


def enqueue_semester_check(
    rt: Runtime,
    short_code: str,
    university_name: str,
    url: str,
    priority: float = 4.0,
) -> bool:
    """Queue a live university semester check task (docs/04 §2.5, docs/05 §2)."""
    rt.guard(url)
    code = short_code.strip().upper()
    with session_scope() as session:
        return frontier.enqueue(
            session,
            TaskKind.CHECK_UNIVERSITY_SEMESTER,
            url,
            depth=0,
            priority=priority,
            reason={"university_semester_check": code},
            settings=rt.settings,
            key=f"{code}:{canonical_url(url)}",
            payload={"short_code": code, "university_name": university_name},
        )


def enqueue_extract(rt: Runtime, source_id: uuid.UUID, url: str, priority: float = 2.0) -> bool:
    """Queue an explicit EXTRACT task for a stored Source snapshot."""
    with session_scope() as session:
        return frontier.enqueue(
            session,
            TaskKind.EXTRACT,
            url,
            depth=0,
            priority=priority,
            reason={"re_extract": True},
            settings=rt.settings,
            key=str(source_id),
            payload={"source_id": str(source_id)},
        )


def _extract_and_store(
    session: Session,
    rt: Runtime,
    source: catalogue.SourceSnapshotOut,
    *,
    depth: int,
    priority: float,
    direction_slug: str | None = None,
) -> tuple[list[str], list[str]]:
    outcome = extract_from_source(source, proposer=rt.proposer)
    recorded_slugs: list[str] = []
    for draft in outcome.drafts:
        opp = catalogue.record_opportunity(session, draft)
        recorded_slugs.append(opp.slug)
        app_url = draft.application_url.value
        if app_url:
            payload = {"opportunity_slug": opp.slug}
            if direction_slug:
                payload["direction_slug"] = direction_slug
            frontier.enqueue(
                session,
                TaskKind.INSPECT_PORTAL,
                app_url,
                depth=depth,
                priority=round(priority + 0.5, 4),
                reason={"opportunity_slug": opp.slug, "from_source": str(source.id)},
                settings=rt.settings,
                key=f"{opp.slug}:{canonical_url(app_url)}",
                payload=payload,
            )
    return recorded_slugs, outcome.flagged_injections


def _handle_search(rt: Runtime, task: frontier.ClaimedTask) -> None:
    query = task.payload["query"]
    direction_slug = task.payload["direction_slug"]
    demand_weight = float(task.payload.get("demand_weight", 1.0))
    leads = rt.search(query, rt.settings)

    enqueued = 0
    with session_scope() as session:
        dir_row = session.get(ResearchDirectionRow, direction_slug)
        yld = direction_yield_mean(dir_row) if dir_row else 0.5
        for lead in leads:
            try:
                rt.guard(lead.url)
            except BlockedUrl:
                continue
            rel = relevance_of_text(f"{lead.title} {lead.snippet}")
            prio, signals = score_priority(
                rt.settings,
                relevance=rel,
                novelty=1.0,
                demand=demand_weight,
                direction_yield=yld,
                expected_cost=0.1,
            )
            if frontier.enqueue(
                session,
                TaskKind.FETCH,
                lead.url,
                depth=0,
                priority=prio,
                reason={
                    "direction": direction_slug,
                    "title": lead.title[:160],
                    "engine": lead.engine,
                    "signals": signals,
                },
                settings=rt.settings,
                payload={"direction_slug": direction_slug},
            ):
                enqueued += 1
        record_direction_outcome(
            session,
            direction_slug,
            attempts_delta=1,
            leads_delta=enqueued,
            cost_delta=0.05,
        )
        frontier.complete(
            session,
            task,
            {"direction": direction_slug, "leads": len(leads), "enqueued": enqueued},
        )


def _handle_extract(rt: Runtime, task: frontier.ClaimedTask) -> None:
    with session_scope() as session:
        source = catalogue.get_source(session, uuid.UUID(task.payload["source_id"]))
        slugs, flagged = _extract_and_store(
            session,
            rt,
            source,
            depth=task.depth,
            priority=task.priority,
            direction_slug=task.payload.get("direction_slug"),
        )
        frontier.complete(
            session,
            task,
            {"opportunities": slugs, "flagged_injections": flagged},
        )


def _handle_inspect_portal(rt: Runtime, task: frontier.ClaimedTask) -> None:
    if not rt.robots.allowed(task.url):
        with session_scope() as session:
            frontier.skip(session, task, "disallowed by robots.txt")
        return

    got = rt.static(task.url, rt.settings, guard=rt.guard)
    if len(got.snapshot.text) < rt.settings.thin_text_chars and rt.settings.render_thin_pages:
        got = rt.rendered(task.url, rt.settings, guard=rt.guard)

    slug = task.payload["opportunity_slug"]
    direction_slug = task.payload.get("direction_slug")
    with session_scope() as session:
        before = catalogue.get_opportunity(session, slug).status
        source = catalogue.store_snapshot(session, got.snapshot)
        full_source = catalogue.get_source(session, source.id)
        blueprint_draft = inspect_portal_snapshot(slug, full_source)
        bp = catalogue.record_portal_blueprint(session, blueprint_draft)
        after = catalogue.get_opportunity(session, slug).status
        if (
            direction_slug
            and before is not catalogue.OpportunityStatus.VERIFIED
            and after is catalogue.OpportunityStatus.VERIFIED
        ):
            record_direction_outcome(
                session, direction_slug, verified_delta=1, cost_delta=0.15
            )
        frontier.complete(
            session,
            task,
            {
                "source_id": str(source.id),
                "blueprint_id": str(bp.id),
                "version": bp.version,
                "opportunity_slug": slug,
                "opportunity_status": after.value,
            },
        )


def _handle_semester_check(rt: Runtime, task: frontier.ClaimedTask) -> None:
    if not rt.robots.allowed(task.url):
        with session_scope() as session:
            frontier.skip(session, task, "disallowed by robots.txt")
        return

    got = rt.static(task.url, rt.settings, guard=rt.guard)
    if len(got.snapshot.text) < rt.settings.thin_text_chars and rt.settings.render_thin_pages:
        got = rt.rendered(task.url, rt.settings, guard=rt.guard)

    short_code = task.payload["short_code"]
    university_name = task.payload["university_name"]
    with session_scope() as session:
        source = catalogue.store_snapshot(session, got.snapshot)
        full_source = catalogue.get_source(session, source.id)
        parsed = parse_university_semester(short_code, university_name, full_source)
        if parsed is None:
            frontier.complete(
                session,
                task,
                {"source_id": str(source.id), "cached": False, "short_code": short_code},
            )
            return
        rec = catalogue.record_university_semester(session, parsed)
        frontier.complete(
            session,
            task,
            {
                "source_id": str(source.id),
                "cached": True,
                "short_code": rec.short_code,
                "current_session": rec.current_session.value,
                "current_semester": rec.current_semester.value,
            },
        )


def _handle(rt: Runtime, task: frontier.ClaimedTask) -> None:
    if task.kind is TaskKind.SEARCH:
        _handle_search(rt, task)
        return
    if task.kind is TaskKind.EXTRACT:
        _handle_extract(rt, task)
        return
    if task.kind is TaskKind.INSPECT_PORTAL:
        _handle_inspect_portal(rt, task)
        return
    if task.kind is TaskKind.CHECK_UNIVERSITY_SEMESTER:
        _handle_semester_check(rt, task)
        return

    if not rt.robots.allowed(task.url):
        with session_scope() as session:
            frontier.skip(session, task, "disallowed by robots.txt")
        log.info("skip %s robots.txt", task.url)
        return

    fetch = rt.static if task.kind is TaskKind.FETCH else rt.rendered
    got = fetch(task.url, rt.settings, guard=rt.guard)
    thin = task.kind is TaskKind.FETCH and len(got.snapshot.text) < rt.settings.thin_text_chars
    direction_slug = task.payload.get("direction_slug")

    with session_scope() as session:
        source = catalogue.store_snapshot(session, got.snapshot)
        render_queued = False
        if thin and rt.settings.render_thin_pages:
            render_payload = {"direction_slug": direction_slug} if direction_slug else None
            render_queued = frontier.enqueue(
                session,
                TaskKind.RENDER,
                task.url,
                depth=task.depth,
                priority=task.priority,
                reason={"thin_static_text": len(got.snapshot.text)},
                settings=rt.settings,
                payload=render_payload,
            )
        opportunities: list[str] = []
        flagged_injections: list[str] = []
        if not thin:
            full_source = catalogue.get_source(session, source.id)
            opportunities, flagged_injections = _extract_and_store(
                session,
                rt,
                full_source,
                depth=task.depth,
                priority=task.priority,
                direction_slug=direction_slug,
            )
        children = 0
        if task.depth < rt.settings.max_depth:
            child_payload = {"direction_slug": direction_slug} if direction_slug else None
            for url, link, term in follow_candidates(got.links, got.snapshot.final_url):
                children += frontier.enqueue(
                    session,
                    TaskKind.FETCH,
                    url,
                    depth=task.depth + 1,
                    priority=round(task.priority * CHILD_PRIORITY_DECAY, 4),
                    reason={"from": task.url, "anchor": link.anchor[:200], "term": term},
                    settings=rt.settings,
                    payload=child_payload,
                )
        result = {
            "source_id": str(source.id),
            "children": children,
            "render_queued": render_queued,
        }
        if opportunities:
            result["opportunities"] = opportunities
        if flagged_injections:
            result["flagged_injections"] = flagged_injections
        frontier.complete(session, task, result)
    log.info("done %s %s children=%d", task.kind.value, task.url, children)


def run_one(rt: Runtime) -> bool:
    """Process at most one task. Returns False when nothing was claimable."""
    with session_scope() as session:
        task = frontier.claim(session, rt.settings)
    if task is None:
        return False
    try:
        _handle(rt, task)
    except frontier.LeaseLost as exc:
        log.warning("lease lost: %s", exc)
    except (BlockedUrl, FetchFailed) as exc:
        retryable = isinstance(exc, FetchFailed) and exc.retryable
        _record_failure(rt, task, str(exc), retryable)
    except Exception as exc:
        log.exception("task %s crashed", task.id)
        _record_failure(rt, task, f"{type(exc).__name__}: {exc}", True)
    return True


def _record_failure(rt: Runtime, task: frontier.ClaimedTask, error: str, retryable: bool) -> None:
    log.info("fail %s %s retryable=%s: %s", task.kind.value, task.url, retryable, error)
    try:
        with session_scope() as session:
            frontier.fail(session, task, error, retryable=retryable, settings=rt.settings)
    except frontier.LeaseLost as exc:
        log.warning("lease lost while failing: %s", exc)


def run(rt: Runtime, *, max_tasks: int | None = None, until_empty: bool = False,
        idle_sleep: float = 1.0) -> int:
    """Work the frontier. Stops after max_tasks, or (until_empty) when nothing is pending."""
    done = 0
    while max_tasks is None or done < max_tasks:
        if run_one(rt):
            done += 1
            continue
        if until_empty:
            with session_scope() as session:
                if frontier.pending_count(session) == 0:
                    break
        time.sleep(idle_sleep)
    return done
