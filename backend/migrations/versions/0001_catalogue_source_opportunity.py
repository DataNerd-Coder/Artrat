"""catalogue: source and opportunity

Revision ID: 0001
Revises:
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "source",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("final_url", sa.Text(), nullable=False),
        sa.Column("status_code", sa.Integer(), nullable=False),
        sa.Column(
            "fetch_mode", sa.Enum("static", "rendered", name="fetch_mode"), nullable=False
        ),
        sa.Column("content_hash", sa.String(64), nullable=False),
        sa.Column("title", sa.Text(), nullable=True),
        sa.Column("snapshot_text", sa.Text(), nullable=False),
        sa.Column("retrieved_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("url", "content_hash", name="uq_source_url_hash"),
    )
    op.create_index("ix_source_url", "source", ["url"])
    op.create_table(
        "opportunity",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("slug", sa.String(200), nullable=False, unique=True),
        sa.Column("cycle", sa.String(20), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "candidate", "verified", "upcoming", "open", "closed", "stale", "rejected",
                "withdrawn", name="opportunity_status",
            ),
            nullable=False,
        ),
        sa.Column("claims", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("opportunity")
    op.drop_index("ix_source_url", table_name="source")
    op.drop_table("source")
    sa.Enum(name="opportunity_status").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="fetch_mode").drop(op.get_bind(), checkfirst=True)
