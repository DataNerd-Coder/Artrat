---
status: accepted
---

# Portal rehearsal before document preparation; 100% autonomous submission with Gmail OTP pickup

Before Artrat processes or drafts documents for an Opportunity, it crawls and inspects the actual application portal in a safe dry run (`PortalBlueprint`) to learn the exact fields, separate upload slots (e.g., School Admission Letter vs. JAMB Admission Letter), file size limits, essay prompts, required endorsements (such as an Academic Referee, Mentor, Guarantor, or HOD letter), and whether the portal's rules explicitly ban automation.

Whenever a portal does **not** explicitly prohibit automation, **100% autonomous submission** ("tap and sleep" after the student's single **Declare & Submit** approval) is the primary workflow. Because the student connects **Gmail**, Artrat automatically picks up portal verification codes (OTPs) and archives official confirmation receipts without asking the student to manually enter OTPs. Every prepared application also provides a downloadable **Submission Kit** in `.DOCX` (Word) and `.PDF` formats.

## Consequences

- Portal inspection (`PortalInspectionPending` -> `PortalMapped`) runs before `Preparing` so the student's checklist and document preparation match the real portal form from the start.
- Missing physical signatures or on-request documents trigger persistent tasks synced to **Google Tasks** and **Google Calendar** on a recurring schedule until the document is uploaded and validated inside the app.
