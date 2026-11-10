# Open questions & resolved decisions

Decisions clarified with the project owner across Phase 0 and Phase 1 are recorded below as **Resolved** so no future session re-litigates them.

## Resolved decisions

| # | Question | Decision |
|---|----------|----------|
| **Q1** | Product name | **Artrat** (ScholarPilot was the earlier working name). |
| **Q2** | Primary market & age range | Nigerian university undergraduates (`100 Level` to `600 Level`), university entrants (JAMB), and recent graduates. **Under-18s are served from day one** with DOB Date Picker detection and NDPA 2023 safeguards. |
| **Q4** | Connectors & channels | **Google Tasks, Google Calendar, Gmail, Google Drive, and Instant Bank Statement (Mono/Okra)** are the core connectors. Gmail provides **100% autonomous OTP pickup** and receipt archival (never asking students to type OTPs manually). Missing physical signatures trigger Google Tasks and Calendar reminders repeatedly until uploaded in-app. |
| **Q5** | Portal crawling & end-to-end automation | Artrat **crawls and maps the portal first** (`PortalBlueprint`) before preparing documents. **100% autonomous submission** is the primary workflow whenever a portal does not explicitly ban automation, with downloadable **`.DOCX` and `.PDF` Submission Kits** always available. |
| **Q7** | Visual direction & 3D boundaries | Flat tonal Lavender/Violet surfaces (`#F8F7FC` / `#F1EEF8` / `#FFFFFF` / `#6D28D9`); **only the non-human Artrat companion (`ArtratBot3D.tsx`) is a real Three.js WebGL 3D model**. The `Sparkles` icon is permanently banned across the project. |
| **Q11** | First-time signup & University Semester Engine | Visiting Artrat starts with Sign-Up -> Bio-Data (DOB Date Picker, cascading 36 Nigerian States + FCT & 774 LGAs dropdowns, no upfront CGPA/UTME typing, no referee note) -> Live University Semester Check (independent of static printed school calendars, cached globally per school for autonomous level promotion, with manual force-level override in Settings). |
| **Q12** | Blocking 14-Step AI Onboarding Interview & Distinct Documents | After Connected Apps, a sequential one-by-one conversational AI interview collects & extracts via Vision: WAEC, JAMB, **separate** School Admission Letter and JAMB Admission Letter, School/Dept/Library ID, NIN, Passport, Bank Details, CV (upload or build from scratch with section-by-section questioning), conversational Personal Statement & community roots, Parents' status (living/deceased for orphan/fatherless matching) & work, Fees/Accommodation sponsors, Disabilities, and Transcript last (with Exam Officer compiled semester result fallback). |
| **Q13** | Dynamic Vault & Dynamic Endorsements | The Vault is completely dynamic—never hardcoded around a single example like an HOD letter. Any endorsement (Referee, Mentor, Guarantor, Clergy, or HOD) or on-request document (LGA Certificate, Bank Statement) is requested only when an application requires it and syncs globally. |

## Remaining open questions (non-blocking for P1 frontend)

| # | Question | Working assumption | When needed |
|---|----------|--------------------|-------------|
| **Q3** | Pricing / monetization model | Free during pilot; evaluate student freemium or institutional sponsorship after measuring cost per completed application | Before public launch |
| **Q6** | Cloud hosting target | Containerized Docker Compose stack locally/VPS first; deployable to Azure Container Apps per PRD | Phase 2 |
| **Q9** | Model provider budget per student | OpenRouter / Vision LLM behind model gateway with per-workflow token caps | Phase 2 |
