"""learned_signal table for self-learning anchor/funding cues and aggregator domains

Revision ID: 0007
Revises: 0006
"""

import sqlalchemy as sa
from alembic import op

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "learned_signal",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("category", sa.String(40), nullable=False),
        sa.Column("phrase", sa.String(200), nullable=False),
        sa.Column("alpha", sa.Float(), nullable=False, server_default="1.5"),
        sa.Column("beta", sa.Float(), nullable=False, server_default="1.0"),
        sa.Column("observations", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("category", "phrase", name="uq_learned_signal_category_phrase"),
    )
    op.create_index("ix_learned_signal_category", "learned_signal", ["category"])
    op.create_index("ix_learned_signal_phrase", "learned_signal", ["phrase"])


def downgrade() -> None:
    op.drop_table("learned_signal")
