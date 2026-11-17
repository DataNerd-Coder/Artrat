from alembic import context
from sqlalchemy import create_engine

from artrat.catalogue import tables  # noqa: F401 - registers catalogue tables on Base
from artrat.platform.config import get_settings
from artrat.platform.db import Base
from artrat.research import tables as research_tables  # noqa: F401
from artrat.student import tables as student_tables  # noqa: F401
from artrat.submission import tables as submission_tables  # noqa: F401

target_metadata = Base.metadata


def run_migrations_online() -> None:
    url = context.config.attributes.get("database_url") or get_settings().database_url
    engine = create_engine(url)
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()
    engine.dispose()


run_migrations_online()
