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
    evolve_direction_from_discovery,
    record_direction_outcome,
    relevance_of_text,
    score_priority,
)
from artrat.research.extract import Proposer, default_propose, extract_from_source
from artrat.research.fetch import FetchFailed, Retrieved, fetch_rendered, fetch_static, http_get
from artrat.research.learning import (
    is_learned_aggregator_url,
    learn_from_crawl_outcome,
    sync_learned_signals_from_db,
)
from artrat.research.links import canonical_url, follow_candidates, resolve_dropped_link
from artrat.research.portal import inspect_portal_snapshot
from artrat.research.robots import RobotsCache
from artrat.research.search import Searcher, searxng_search
from artrat.research.semester import parse_university_semester
from artrat.research.tables import ResearchDirectionRow, TaskKind

log = logging.getLogger("artrat.agent")

CHILD_PRIORITY_DECAY = 0.8
LINK_DROP_PRIORITY = 10.0

AGGREGATOR_HOSTS = (
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

Fetch = Callable[..., Retrieved]
PortalInspector = Callable[[str, catalogue.SourceSnapshotOut], catalogue.PortalBlueprintDraft]
PortalNavigator = Callable[..., dict]


def _is_aggregator_url(url: str) -> bool:
    low = url.lower()
    return any(h in low for h in AGGREGATOR_HOSTS) or is_learned_aggregator_url(url)


@dataclass
class Runtime:
    settings: Settings
    robots: RobotsCache
    guard: Callable[[str], str] = assert_public_http_url
    static: Fetch = fetch_static
    rendered: Fetch = fetch_rendered
    proposer: Proposer = default_propose
    search: Searcher = searxng_search
    portal_inspector: PortalInspector = inspect_portal_snapshot
    portal_navigator: PortalNavigator | None = None


def default_runtime(settings: Settings) -> Runtime:
    gateway = OpenRouterGateway(settings)

    def get_robots(url: str) -> tuple[int, str]:
        _, status, body = http_get(url, settings)
        return status, body

    return Runtime(
        settings=settings,
        robots=RobotsCache(get_robots, settings.robots_agent),
        proposer=gateway.propose,
        portal_inspector=gateway.inspect_portal_blueprint,
        portal_navigator=gateway.decide_next_portal_step,
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


def _fetch_portal_page(rt: Runtime, url: str) -> Retrieved:
    try:
        got = rt.static(url, rt.settings, guard=rt.guard)
    except FetchFailed:
        if rt.settings.render_thin_pages:
            got = rt.rendered(url, rt.settings, guard=rt.guard)
        else:
            raise
    if len(got.snapshot.text) < rt.settings.thin_text_chars and rt.settings.render_thin_pages:
        got = rt.rendered(url, rt.settings, guard=rt.guard)
    return got


def _handle_inspect_portal(rt: Runtime, task: frontier.ClaimedTask) -> None:
    if not rt.robots.allowed(task.url):
        with session_scope() as session:
            frontier.skip(session, task, "disallowed by robots.txt")
        return

    got = _fetch_portal_page(rt, task.url)
    initial_links = [(lnk.anchor, lnk.url) for lnk in got.links]
    initial_url = got.snapshot.final_url
    flagged_as_blog = _is_aggregator_url(initial_url)
    chosen_hop_url: str | None = None

    # Step 1: If we started on an aggregator blog, use AI navigation + outbound links + search to
    # hop to the real official portal and DISCARD the blog snapshot text so dry-run requirements
    # come strictly from the official portal/form.
    if flagged_as_blog or rt.portal_navigator is not None:
        target_official_url: str | None = None
        search_query: str | None = None
        if rt.portal_navigator is not None and flagged_as_blog:
            try:
                plan = rt.portal_navigator(
                    current_url=got.snapshot.final_url,
                    page_text=got.snapshot.text,
                    links=initial_links,
                )
                if plan.get("is_aggregator_blog"):
                    flagged_as_blog = True
                candidate = plan.get("target_url")
                if isinstance(candidate, str) and candidate.startswith("http") and not _is_aggregator_url(candidate):
                    target_official_url = candidate
                q = plan.get("official_search_query")
                if isinstance(q, str) and q.strip():
                    search_query = q.strip()
            except RuntimeError as exc:
                log.debug("portal navigator fallback: %s", exc)
        if flagged_as_blog and target_official_url is None:
            for ln in got.snapshot.text.splitlines():
                if ln.startswith("Apply at http"):
                    hop_url = ln.removeprefix("Apply at ").strip()
                    if not _is_aggregator_url(hop_url):
                        target_official_url = hop_url
                        break
        if flagged_as_blog and target_official_url is None and search_query:
            try:
                for lead in rt.search(search_query, rt.settings):
                    if not _is_aggregator_url(lead.url) and rt.robots.allowed(lead.url):
                        target_official_url = lead.url
                        break
            except RuntimeError as exc:
                log.debug("official portal search fallback: %s", exc)
        if target_official_url and rt.robots.allowed(target_official_url):
            try:
                # Replace `got` completely: zero blog text is kept.
                got = _fetch_portal_page(rt, target_official_url)
                chosen_hop_url = target_official_url
            except (BlockedUrl, FetchFailed):
                pass

    # Step 2: On the official portal, follow any official downloadable .docm/.docx application forms,
    # candidate registration routes (/candidate/register), or online form links (forms.gle / Google Forms).
    if not _is_aggregator_url(got.snapshot.final_url):
        extra_sections: list[str] = []
        final_portal_url = got.snapshot.final_url
        doc_links = [
            lnk.url
            for lnk in got.links
            if lnk.url.lower().endswith((".docm", ".docx"))
            or "/candidate/register" in lnk.url.lower()
        ]
        for doc_url in dict.fromkeys(doc_links):
            if rt.robots.allowed(doc_url):
                try:
                    doc_got = rt.static(doc_url, rt.settings, guard=rt.guard)
                    extra_sections.append(
                        f"--- Official Form ({doc_got.snapshot.final_url}) ---\n{doc_got.snapshot.text}"
                    )
                except (BlockedUrl, FetchFailed):
                    continue
        for ln in got.snapshot.text.splitlines():
            if ln.startswith("Apply at http"):
                hop_url = ln.removeprefix("Apply at ").strip()
                if (
                    hop_url != got.snapshot.url
                    and hop_url != got.snapshot.final_url
                    and not _is_aggregator_url(hop_url)
                    and rt.robots.allowed(hop_url)
                ):
                    try:
                        hop_got = _fetch_portal_page(rt, hop_url)
                        final_portal_url = hop_got.snapshot.final_url
                        extra_sections.append(
                            f"--- Destination Form ({hop_got.snapshot.final_url}) ---\n{hop_got.snapshot.text}"
                        )
                        break
                    except (BlockedUrl, FetchFailed):
                        continue
        if extra_sections:
            got = Retrieved(
                snapshot=catalogue.SnapshotIn(
                    url=got.snapshot.url,
                    final_url=final_portal_url,
                    status_code=got.snapshot.status_code,
                    fetch_mode=got.snapshot.fetch_mode,
                    title=got.snapshot.title,
                    text=got.snapshot.text + "\n" + "\n".join(extra_sections),
                    retrieved_at=got.snapshot.retrieved_at,
                ),
                links=got.links,
            )

    slug = task.payload["opportunity_slug"]
    direction_slug = task.payload.get("direction_slug")
    with session_scope() as session:
        sync_learned_signals_from_db(session)
        before_opp = catalogue.get_opportunity(session, slug)
        before = before_opp.status
        source = catalogue.store_snapshot(session, got.snapshot)
        full_source = catalogue.get_source(session, source.id)
        blueprint_draft = rt.portal_inspector(slug, full_source)
        bp = catalogue.record_portal_blueprint(session, blueprint_draft)
        after = catalogue.get_opportunity(session, slug).status
        learn_from_crawl_outcome(
            session,
            source_url=initial_url,
            links=initial_links,
            chosen_target_url=chosen_hop_url,
            yielded_opportunity=True,
            is_aggregator_blog=flagged_as_blog,
        )
        if after is catalogue.OpportunityStatus.VERIFIED:
            evolve_direction_from_discovery(
                session,
                title=slug.replace("-", " "),
                official_url=bp.portal_url,
            )
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
