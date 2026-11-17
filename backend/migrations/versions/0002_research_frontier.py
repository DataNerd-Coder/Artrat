"""research: frontier tasks and per-site politeness state

Revision ID: 0002
Revises: 0001
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "site_state",
        sa.Column("site", sa.String(255), primary_key=True),
        sa.Column("next_allowed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("pages_enqueued", sa.Integer(), nullable=False),
    )
    op.create_table(
        "research_task",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("kind", sa.Enum("fetch", "render", name="research_task_kind"), nullable=False),
        sa.Column("key", sa.Text(), nullable=False),
        sa.Column("site", sa.String(255), nullable=False),
        sa.Column("payload", postgresql.JSONB(), nullable=False),
        sa.Column("priority", sa.Float(), nullable=False),
        sa.Column("reason", postgresql.JSONB(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("queued", "running", "done", "skipped", "dead", name="research_task_status"),
            nullable=False,
        ),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("max_attempts", sa.Integer(), nullable=False),
        sa.Column("run_after", sa.DateTime(timezone=True), nullable=False),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("result", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("kind", "key", name="uq_research_task_kind_key"),
    )
    op.create_index("ix_research_task_site", "research_task", ["site"])
    # The claim query: runnable tasks by priority.
    op.create_index(
        "ix_research_task_claim",
        "research_task",
        ["status", sa.text("priority DESC"), "created_at"],
        postgresql_where=sa.text("status IN ('queued', 'running')"),
    )


def downgrade() -> None:
    op.drop_table("research_task")
    op.drop_table("site_state")
    sa.Enum(name="research_task_status").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="research_task_kind").drop(op.get_bind(), checkfirst=True)
