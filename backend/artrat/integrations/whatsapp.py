"""WhatsApp notification connector & cost telemetry (Phase 6, docs/07)."""

from dataclasses import dataclass, field
from datetime import UTC, datetime


@dataclass(frozen=True)
class NotificationEvent:
    student_id: str
    channel: str
    category: str
    message: str
    sent_at: datetime


@dataclass
class NotificationDispatcher:
    events: list[NotificationEvent] = field(default_factory=list)

    def send_whatsapp(self, student_id: str, category: str, message: str) -> NotificationEvent:
        evt = NotificationEvent(
            student_id=student_id,
            channel="whatsapp",
            category=category,
            message=message,
            sent_at=datetime.now(UTC),
        )
        self.events.append(evt)
        return evt
