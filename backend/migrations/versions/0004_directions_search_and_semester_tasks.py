"""research: directions table and search / check_university_semester task kinds

Revision ID: 0004
Revises: 0003
"""

import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE research_task_kind ADD VALUE IF NOT EXISTS 'search'")
    op.execute(
        "ALTER TYPE research_task_kind ADD VALUE IF NOT EXISTS 'check_university_semester'"
    )

    op.create_table(
        "research_direction",
        sa.Column("slug", sa.String(120), primary_key=True),
        sa.Column("channel", sa.String(40), nullable=False),
        sa.Column("query", sa.Text(), nullable=False),
        sa.Column("demand_weight", sa.Float(), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("leads_found", sa.Integer(), nullable=False),
        sa.Column("verified_opportunities", sa.Integer(), nullable=False),
        sa.Column("expired_opportunities", sa.Integer(), nullable=False),
        sa.Column("total_cost", sa.Float(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("research_direction")
