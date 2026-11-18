"""Tests run against a real Postgres 16 (embedded via pgserver), migrated with Alembic."""

import os
import tempfile

import pgserver
import pytest

_pg = pgserver.get_server(tempfile.mkdtemp(prefix="artrat-pg-"), cleanup_mode="stop")
os.environ["ARTRAT_DATABASE_URL"] = _pg.get_uri().replace("postgresql://", "postgresql+psycopg://")


@pytest.fixture(scope="session", autouse=True)
def migrated_db():
    from artrat.cli import main

    main(["migrate"])
    yield


@pytest.fixture
def session():
    from sqlalchemy import text

    from artrat.platform.db import session_scope

    with session_scope() as s:
        s.execute(
            text(
                "truncate source, opportunity, portal_blueprint, university_semester,"
                " research_task, site_state, research_direction, learned_signal,"
                " student, vault_document, profile_fact, application, student_task,"
                " evidence_ledger, application_package, application_approval, application_submission"
                " cascade"
            )
        )
    with session_scope() as s:
        yield s
