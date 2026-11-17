"""Scoped Gmail OTP pickup, receipt archival, and Google Tasks/Calendar connectors (docs/06 §3.4).

Rule #4 (docs/06 §3.4):
When Gmail is connected, Artrat reads ONLY incoming verification OTPs and official confirmation
receipts from known scholarship portal domains, never unrelated personal correspondence.
"""

import re
from dataclasses import dataclass
from datetime import datetime
from urllib.parse import urlsplit

OTP_RE = re.compile(
    r"\b(?:otp|verification\s+code|security\s+code|passcode)(?:\s+is)?\s*:?\s*(\d{6,8})\b",
    re.IGNORECASE,
)
RECEIPT_REF_RE = re.compile(
    r"\b(?:reference|receipt|application\s+id|confirmation\s+no\.?)(?:\s+is)?\s*[:#]?\s*([A-Z0-9-]{6,32})\b",
    re.IGNORECASE,
)


class UntrustedSenderDomain(PermissionError):
    """Refuses to read an email whose sender domain does not match the target portal domain."""


@dataclass(frozen=True)
class GmailMessage:
    message_id: str
    sender_email: str
    subject: str
    body_text: str
    received_at: datetime


@dataclass(frozen=True)
class ExtractedReceipt:
    message_id: str
    reference_code: str
    subject: str
    summary: str
    received_at: datetime


def _root_domain(host_or_url: str) -> str:
    raw = host_or_url.strip().lower()
    if "://" in raw:
        raw = (urlsplit(raw).hostname or "").lower()
    elif "@" in raw:
        raw = raw.split("@", 1)[1].strip().lower()
    raw = raw.removeprefix("www.").removeprefix("portal.").removeprefix("apply.").removeprefix("scholarship.")
    return raw


def is_trusted_portal_sender(sender_email: str, portal_url: str) -> bool:
    """True only when the email sender belongs to the same institution/portal domain."""
    sender_dom = _root_domain(sender_email)
    portal_dom = _root_domain(portal_url)
    if not sender_dom or not portal_dom:
        return False
    return (
        sender_dom == portal_dom
        or sender_dom.endswith(f".{portal_dom}")
        or portal_dom.endswith(f".{sender_dom}")
    )


def pickup_portal_otp(portal_url: str, inbox: list[GmailMessage]) -> str | None:
    """Autonomously pick up the newest verification OTP from the target portal's domain.

    Ignores unrelated personal emails so personal correspondence is never read (docs/06 §3.4).
    """
    scoped = [m for m in inbox if is_trusted_portal_sender(m.sender_email, portal_url)]
    scoped.sort(key=lambda m: m.received_at, reverse=True)
    for msg in scoped:
        combined = f"{msg.subject}\n{msg.body_text}"
        m = OTP_RE.search(combined)
        if m:
            return m.group(1)
    return None


def find_submission_receipt(portal_url: str, inbox: list[GmailMessage]) -> ExtractedReceipt | None:
    """Check scoped Gmail messages for an official submission confirmation receipt."""
    scoped = [m for m in inbox if is_trusted_portal_sender(m.sender_email, portal_url)]
    scoped.sort(key=lambda m: m.received_at, reverse=True)
    for msg in scoped:
        combined = f"{msg.subject}\n{msg.body_text}"
        low = combined.lower()
        if not any(w in low for w in ("received", "submitted", "confirmation", "successful")):
            continue
        m = RECEIPT_REF_RE.search(combined)
        ref_code = m.group(1).upper() if m else f"RCPT-{msg.message_id[:8].upper()}"
        return ExtractedReceipt(
            message_id=msg.message_id,
            reference_code=ref_code,
            subject=msg.subject,
            summary=f"Confirmed receipt {ref_code} from {msg.sender_email}",
            received_at=msg.received_at,
        )
    return None
