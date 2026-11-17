"""One image, several roles: `artrat api`, `artrat agent ...`, `artrat migrate`, `artrat openapi`."""

import argparse
import json
import sys
from pathlib import Path


def _migrate(_: argparse.Namespace) -> None:
    from alembic import command
    from alembic.config import Config

    cfg = Config(str(Path(__file__).resolve().parent.parent / "alembic.ini"))
    command.upgrade(cfg, "head")


def _api(args: argparse.Namespace) -> None:
    import uvicorn

    uvicorn.run("artrat.api.app:app", host=args.host, port=args.port)


def _agent_fetch(args: argparse.Namespace) -> None:
    from artrat.catalogue import api as catalogue
    from artrat.platform.config import get_settings
    from artrat.platform.db import session_scope
    from artrat.research.fetch import fetch_rendered, fetch_static

    settings = get_settings()
    got = (fetch_rendered if args.render else fetch_static)(args.url, settings)
    with session_scope() as session:
        source = catalogue.store_snapshot(session, got.snapshot)
    print(source.model_dump_json(indent=2))


def _agent_seed(args: argparse.Namespace) -> None:
    from artrat.platform.config import get_settings
    from artrat.research import agent

    added = agent.seed(agent.default_runtime(get_settings()), args.urls)
    print(f"queued {added} of {len(args.urls)} seed URL(s)")


def _agent_search(args: argparse.Namespace) -> None:
    from artrat.platform.config import get_settings
    from artrat.research import agent

    queued = agent.plan_searches(agent.default_runtime(get_settings()), count=args.count)
    print(f"queued {len(queued)} search direction(s): {', '.join(queued)}")


def _agent_check_semester(args: argparse.Namespace) -> None:
    from artrat.platform.config import get_settings
    from artrat.research import agent

    queued = agent.enqueue_semester_check(
        agent.default_runtime(get_settings()),
        args.short_code,
        args.university_name,
        args.url,
    )
    print("queued" if queued else "already queued")


def _agent_drop(args: argparse.Namespace) -> None:
    from artrat.platform.config import get_settings
    from artrat.research import agent

    queued = agent.drop_link(agent.default_runtime(get_settings()), args.url)
    print("queued" if queued else "already queued")


def _agent_run(args: argparse.Namespace) -> None:
    import logging

    from artrat.platform.config import get_settings
    from artrat.research import agent

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    rt = agent.default_runtime(get_settings())
    n = agent.run(rt, max_tasks=args.max_tasks, until_empty=args.until_empty)
    print(f"processed {n} task(s)")


def _agent_status(_: argparse.Namespace) -> None:
    from artrat.platform.db import session_scope
    from artrat.research import frontier

    with session_scope() as session:
        print(json.dumps(frontier.status_counts(session), indent=2))


def _openapi(args: argparse.Namespace) -> None:
    import yaml

    from artrat.api.app import app

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(yaml.safe_dump(json.loads(json.dumps(app.openapi())), sort_keys=False))
    print(f"wrote {out}")


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="artrat")
    sub = parser.add_subparsers(required=True)

    p = sub.add_parser("migrate", help="apply database migrations")
    p.set_defaults(run=_migrate)

    p = sub.add_parser("api", help="serve the HTTP API")
    p.add_argument("--host", default="0.0.0.0")
    p.add_argument("--port", type=int, default=8000)
    p.set_defaults(run=_api)

    agent = sub.add_parser("agent", help="discovery agent role").add_subparsers(required=True)
    p = agent.add_parser("fetch", help="retrieve one URL into the Catalogue as a Source")
    p.add_argument("url")
    p.add_argument("--render", action="store_true", help="use the browser worker")
    p.set_defaults(run=_agent_fetch)

    p = agent.add_parser("seed", help="add seed URLs to the research frontier")
    p.add_argument("urls", nargs="+")
    p.set_defaults(run=_agent_seed)

    p = agent.add_parser("search", help="Thompson-sample directions and queue SearXNG searches")
    p.add_argument("--count", type=int, default=3)
    p.set_defaults(run=_agent_search)

    p = agent.add_parser(
        "check-semester", help="queue a live university session/semester verification check"
    )
    p.add_argument("short_code")
    p.add_argument("university_name")
    p.add_argument("url")
    p.set_defaults(run=_agent_check_semester)

    p = agent.add_parser("drop", help="prioritize a student-dropped scholarship URL")
    p.add_argument("url")
    p.set_defaults(run=_agent_drop)

    p = agent.add_parser("run", help="work the research frontier")
    p.add_argument("--max-tasks", type=int, default=None)
    p.add_argument("--until-empty", action="store_true", help="exit when nothing is pending")
    p.set_defaults(run=_agent_run)

    p = agent.add_parser("status", help="frontier task counts by status")
    p.set_defaults(run=_agent_status)

    p = sub.add_parser("openapi", help="write the OpenAPI contract")
    p.add_argument("--out", default="../contract/openapi.yaml")
    p.set_defaults(run=_openapi)

    args = parser.parse_args(argv)
    args.run(args)


if __name__ == "__main__":
    sys.exit(main())
