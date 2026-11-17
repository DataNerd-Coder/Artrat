"""student: student, profile_fact, vault_document, application, and student_task tables

Revision ID: 0005
Revises: 0004
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None

DOC_TYPES = (
    "waec_result",
    "jamb_result",
    "school_admission_letter",
    "jamb_admission_letter",
    "school_id",
    "nin_slip",
    "passport_photo",
    "cv",
    "transcript",
    "lga_certificate",
    "bank_statement",
    "dynamic_endorsement",
)

SIGNER_ROLES = (
    "academic_referee",
    "mentor",
    "guarantor",
    "hod",
    "dean",
    "exam_officer",
    "employer",
    "community_leader",
    "clergy",
    "guardian",
    "other",
)


def upgrade() -> None:
    op.create_table(
        "student",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("full_name", sa.Text(), nullable=False),
        sa.Column("date_of_birth", sa.Date(), nullable=False),
        sa.Column("is_minor", sa.Boolean(), nullable=False),
        sa.Column("institution", sa.Text(), nullable=False),
        sa.Column("department", sa.Text(), nullable=False),
        sa.Column("matric_number", sa.String(120), nullable=False),
        sa.Column("academic_level", sa.String(40), nullable=False),
        sa.Column("autonomous_level_promotion", sa.Boolean(), nullable=False),
        sa.Column("state_of_origin", sa.String(80), nullable=False),
        sa.Column("lga", sa.String(120), nullable=False),
        sa.Column("residential_address", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_student_email", "student", ["email"])

    doc_type_enum = sa.Enum(*DOC_TYPES, name="vault_document_type")
    signer_role_enum = sa.Enum(*SIGNER_ROLES, name="signer_role")

    op.create_table(
        "vault_document",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "student_id",
            sa.Uuid(),
            sa.ForeignKey("student.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("doc_type", doc_type_enum, nullable=False),
        sa.Column("signed_by", signer_role_enum, nullable=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("file_name", sa.Text(), nullable=False),
        sa.Column("storage_key", sa.Text(), nullable=False),
        sa.Column("extracted_summary", sa.Text(), nullable=False),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_vault_document_student_id", "vault_document", ["student_id"])

    op.create_table(
        "profile_fact",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "student_id",
            sa.Uuid(),
            sa.ForeignKey("student.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("key", sa.String(80), nullable=False),
        sa.Column("label", sa.Text(), nullable=False),
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column(
            "origin",
            sa.Enum("self_reported", "document_extracted", "verified", name="fact_origin"),
            nullable=False,
        ),
        sa.Column("source_detail", sa.Text(), nullable=False),
        sa.Column(
            "document_id",
            sa.Uuid(),
            sa.ForeignKey("vault_document.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("student_id", "key", name="uq_profile_fact_student_key"),
    )
    op.create_index("ix_profile_fact_student_id", "profile_fact", ["student_id"])

    op.create_table(
        "application",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "student_id",
            sa.Uuid(),
            sa.ForeignKey("student.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "opportunity_id",
            sa.Uuid(),
            sa.ForeignKey("opportunity.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("opportunity_slug", sa.String(200), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "portal_inspection_pending",
                "portal_mapped",
                "preparing",
                "waiting_for_requirements",
                "ready_for_review",
                "approved_for_execution",
                "executing",
                "verifying_submission",
                "submitted",
                "submission_kit_exported",
                name="application_status",
            ),
            nullable=False,
        ),
        sa.Column("ordered_items", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("student_id", "opportunity_id", name="uq_application_student_opp"),
    )
    op.create_index("ix_application_student_id", "application", ["student_id"])
    op.create_index("ix_application_opportunity_id", "application", ["opportunity_id"])

    op.create_table(
        "student_task",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "student_id",
            sa.Uuid(),
            sa.ForeignKey("student.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "application_id",
            sa.Uuid(),
            sa.ForeignKey("application.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("checklist_item_key", sa.String(255), nullable=False, unique=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("doc_type", doc_type_enum, nullable=False),
        sa.Column("signed_by", signer_role_enum, nullable=True),
        sa.Column(
            "status",
            sa.Enum("open", "satisfied", name="student_task_status"),
            nullable=False,
        ),
        sa.Column("manual_completion_allowed", sa.Boolean(), nullable=False),
        sa.Column("google_task_id", sa.String(160), nullable=True),
        sa.Column("google_calendar_event_id", sa.String(160), nullable=True),
        sa.Column("sync_status", sa.String(40), nullable=False),
        sa.Column("interval_hours", sa.Integer(), nullable=False),
        sa.Column("last_triggered_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("next_trigger_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_student_task_student_id", "student_task", ["student_id"])
    op.create_index("ix_student_task_application_id", "student_task", ["application_id"])


def downgrade() -> None:
    op.drop_table("student_task")
    op.drop_table("application")
    op.drop_table("profile_fact")
    op.drop_table("vault_document")
    op.drop_table("student")
    for enum_name in (
        "student_task_status",
        "application_status",
        "fact_origin",
        "signer_role",
        "vault_document_type",
    ):
        sa.Enum(name=enum_name).drop(op.get_bind(), checkfirst=True)
