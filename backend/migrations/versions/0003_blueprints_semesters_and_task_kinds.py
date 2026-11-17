"""catalogue & research: portal blueprints, university semesters, and extract/inspect task kinds

Revision ID: 0003
Revises: 0002
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE research_task_kind ADD VALUE IF NOT EXISTS 'extract'")
    op.execute("ALTER TYPE research_task_kind ADD VALUE IF NOT EXISTS 'inspect_portal'")

    op.create_table(
        "portal_blueprint",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "opportunity_id",
            sa.Uuid(),
            sa.ForeignKey("opportunity.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("portal_url", sa.Text(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("fields", postgresql.JSONB(), nullable=False),
        sa.Column("uploads", postgresql.JSONB(), nullable=False),
        sa.Column("essay_prompts", postgresql.JSONB(), nullable=False),
        sa.Column("declarations", postgresql.JSONB(), nullable=False),
        sa.Column("auth_steps", postgresql.JSONB(), nullable=False),
        sa.Column("automation_policy", postgresql.JSONB(), nullable=False),
        sa.Column("inspected_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_portal_blueprint_opportunity_id", "portal_blueprint", ["opportunity_id"])

    op.create_table(
        "university_semester",
        sa.Column("short_code", sa.String(32), primary_key=True),
        sa.Column("university_name", sa.Text(), nullable=False),
        sa.Column("current_session", postgresql.JSONB(), nullable=False),
        sa.Column("current_semester", postgresql.JSONB(), nullable=False),
        sa.Column("next_level_promotion_window", sa.Text(), nullable=False),
        sa.Column("last_checked_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("university_semester")
    op.drop_index("ix_portal_blueprint_opportunity_id", table_name="portal_blueprint")
    op.drop_table("portal_blueprint")
