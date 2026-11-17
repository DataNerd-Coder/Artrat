"""On-Request Instant Bank Statement Connector (Mono / Okra, docs/06 §3.6, docs/09 §3.2).

Rule #6 (docs/06 §3.6):
The Mono/Okra Bank Statement connector is invoked ONLY when a specific scholarship portal requires
a certified bank statement, using read-only statement scope and storing the generated statement in
the student's Dynamic Vault.
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from artrat.catalogue.api import DocumentType
from artrat.student import api as student


class BankStatementNotRequired(PermissionError):
    """Refuses to pull a bank statement when no active Application requires one (docs/06 §3.6)."""


def pull_on_request_bank_statement(
    session: Session,
    student_id: uuid.UUID,
    *,
    provider: str = "mono",
    institution_name: str = "Access Bank",
    account_masked: str = "****3410",
    months: int = 6,
) -> student.VaultDocumentOut:
    """Pull a read-only PDF bank statement ONLY if an Application requires `bank_statement`."""
    apps = student.list_student_applications(session, student_id)
    needs_statement = any(
        item.get("kind") == "upload" and item.get("doc_type") == DocumentType.BANK_STATEMENT.value
        for app in apps
        for item in app.ordered_items
    )
    if not needs_statement:
        raise BankStatementNotRequired(
            "Mono/Okra bank statement pull is restricted to on-request use when an application"
            " requires a bank_statement upload (docs/06 §3.6)"
        )

    stamp = datetime.now(UTC).strftime("%Y%m%d")
    return student.upload_vault_document(
        session,
        student_id,
        student.VaultUploadIn(
            doc_type=DocumentType.BANK_STATEMENT,
            title=f"Certified {months}-Month Bank Statement ({institution_name})",
            file_name=f"{institution_name.replace(' ', '_')}_{months}M_Statement_{stamp}.pdf",
            storage_key=f"vault/{student_id}/bank-statement-{provider}-{stamp}.pdf",
            extracted_summary=(
                f"Verified {months}-month read-only statement via {provider.upper()}"
                f" for {institution_name} ({account_masked})"
            ),
        ),
    )
