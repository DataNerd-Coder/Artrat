"""submission: evidence_ledger, application_package, application_approval, application_submission

Revision ID: 0006
Revises: 0005
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "evidence_ledger",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "student_id",
            sa.Uuid(),
            sa.ForeignKey("student.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("category", sa.String(60), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("fact_text", sa.Text(), nullable=False),
        sa.Column("source_detail", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_evidence_ledger_student_id", "evidence_ledger", ["student_id"])

    op.create_table(
        "application_package",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "application_id",
            sa.Uuid(),
            sa.ForeignKey("application.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column(
            "student_id",
            sa.Uuid(),
            sa.ForeignKey("student.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("package_hash", sa.String(64), nullable=False),
        sa.Column("ordered_items", postgresql.JSONB(), nullable=False),
        sa.Column("endorsement_letter", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_application_package_application_id", "application_package", ["application_id"])
    op.create_index("ix_application_package_student_id", "application_package", ["student_id"])

    op.create_table(
        "application_approval",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "application_id",
            sa.Uuid(),
            sa.ForeignKey("application.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "student_id",
            sa.Uuid(),
            sa.ForeignKey("student.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("package_version", sa.Integer(), nullable=False),
        sa.Column("package_hash", sa.String(64), nullable=False),
        sa.Column("declaration_text", sa.Text(), nullable=False),
        sa.Column("voided", sa.Boolean(), nullable=False),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_application_approval_application_id", "application_approval", ["application_id"])
    op.create_index("ix_application_approval_student_id", "application_approval", ["student_id"])

    op.create_table(
        "application_submission",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "application_id",
            sa.Uuid(),
            sa.ForeignKey("application.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column(
            "student_id",
            sa.Uuid(),
            sa.ForeignKey("student.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("package_version", sa.Integer(), nullable=False),
        sa.Column("package_hash", sa.String(64), nullable=False),
        sa.Column("idempotency_key", sa.String(160), nullable=False, unique=True),
        sa.Column("status", sa.String(40), nullable=False),
        sa.Column("portal_reference", sa.String(120), nullable=False),
        sa.Column("otp_used", sa.String(32), nullable=True),
        sa.Column(
            "receipt_vault_doc_id",
            sa.Uuid(),
            sa.ForeignKey("vault_document.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_application_submission_application_id", "application_submission", ["application_id"]
    )
    op.create_index("ix_application_submission_student_id", "application_submission", ["student_id"])


def downgrade() -> None:
    op.drop_table("application_submission")
    op.drop_table("application_approval")
    op.drop_table("application_package")
    op.drop_table("evidence_ledger")
