# 02 · Product specification

Consolidated from S6 (PRD) with the product rules, onboarding architecture, dynamic Vault, and autonomous execution workflows established in `00-source-review.md`, `01-strategy.md`, and `09-onboarding-discovery-interview-spec.md`.

## 1. Core Product Philosophy

1. **Zero Student Browsing or Filtering ("No Discover Tab"):**
   - Students never waste time searching, filtering, or browsing a raw scholarship database.
   - Artrat discovers opportunities autonomously in the background across official websites, search engines, and social media (X/Twitter, LinkedIn, Instagram, Telegram), runs a **dry-run portal inspection**, verifies strict binary eligibility, and **only presents curated Applications where Artrat has already started preparing the package**.
2. **Strict Binary Qualification (Never Fake "90% Match" Scores):**
   - Students never see misleading match percentages. If a scholarship demands First Class Honours (`>= 4.50`) and a student holds a `4.21` (2.1), having every other document ready does **not** make them "90% qualified"—they are disqualified by a hard rule and Artrat will not clutter their active workspace.
3. **First-Time Signup -> Bio-Data -> Connectors -> 14-Step Interactive AI Interview:**
   - New users start with Sign-Up (`Step 1`), Bio-Data & School Details (`Step 2` with DOB Date Picker, Live University Semester Check & Cache, and cascading 36 States + FCT & 774 LGAs dropdowns—no upfront CGPA/UTME inputs and no referee note), and Connected Apps (`Step 3` including Google Tasks, Calendar, Gmail, Drive, and the **Instant Bank Statement Connector**).
   - Clicking continue after Connected Apps is gated by a **sequential, one-by-one Conversational AI Interview** (`Step 4`) that uses Vision AI to extract facts from core documents, builds/audits the student's CV section-by-section, learns their personal statement, hometown roots, parents' status (including deceased parent checks for fatherless/orphan scholarships), sponsorship, and disability state, and finishes with their Transcript or Exam Officer-compiled result sheet.
4. **Dynamic Vault & Dynamic Endorsements (Never Hardcoded to One Role):**
   - The **Vault** is completely dynamic. Beyond core academic documents, scholarships can demand anything tomorrow—an Academic Mentor letter, Guarantor form, Pastor/Imam recommendation, HOD verification, LGA Certificate of Origin, or 6-month Bank Statement.
   - Artrat requests such items **only when an application requires them**, drafts any needed request template, and syncs any uploaded document or updated address (e.g., referee, mentor, guarantor, or HOD address) **globally** across the Vault and all Applications.
5. **Distinct School vs. JAMB Admission Letters:**
   - **Admission Letter from School (`University Admission Letter`)** and **Admission Letter from JAMB (`JAMB CAPS Official Admission Letter`)** are always requested, extracted, and stored as **two separate documents**—never merged.
6. **100% Autonomous Execution with Gmail OTP Pickup & Downloadable Submission Kits:**
   - Because the student connects **Gmail**, Artrat automatically reads portal verification codes (OTPs) during portal registration and final submission without ever asking the student to manually enter an OTP code.
   - Every Application also provides a compact **Downloadable Submission Kit** allowing the student to export their prepared writeups and documents in **`.DOCX` (Editable Word Document)** or **`.PDF` (Print-Ready Package)** at any time.

---

## 2. Personas (used for design and fixtures)

| Persona | Situation | Main job |
|---------|-----------|----------|
| **Chisom Okafor / Amaka Obi**, 20 | 300L Electrical Engineering, University of Nigeria Nsukka (UNN), CGPA `4.21/5.00` (2.1), JAMB `308/400`, Enugu State (`Nsukka` LGA) | "Complete the interactive AI onboarding interview once, let Artrat track UNN's real semester, tweak my essays in Canvas, and submit applications autonomously while I sleep" |
| **Zainab Musa**, 16 | 100L Medicine & Surgery, Ahmadu Bello University Zaria, JAMB `312`. Entered university under 18; uses Departmental ID card | "Onboard safely as an under-18 undergraduate using my Departmental ID and Exam Officer result sheet, and get matched to first-year medical awards" |
| **Tunde Bakare**, 23 | First-class graduate (`4.78/5.00`), Computer Science, UNILAG | "Drop scholarship links I see on X into the chatbox so Artrat inspects the portal, preps everything, and submits end-to-end" |

---

## 3. Core Journeys

### J1 · Signup, Bio-Data, Live University Semester Check & Connectors

1. **Sign Up / Sign In:** Google OAuth, Apple ID, or email/password.
2. **Bio-Data & School Details:**
   - Full legal name, **Date of Birth (DOB) Date Picker** (automatically enabling Under-18 NDPA privacy safeguards if `< 18`), University selector, Course, Academic Level (`100L`–`600L`), Matriculation Number, **State of Origin dropdown (36 States + FCT)**, **cascading LGA dropdown (774 LGAs)**, and Residential Writing Address.
   - **Live University Semester Check & Cache:** Selecting a university checks its live session/semester status (independent of static printed calendars) and caches it globally for that school so future students from the same university reuse the verified state and enjoy autonomous level promotion (with a manual force-level override in Settings).
3. **Connected Apps:** One-tap connection for **Google Tasks**, **Google Calendar**, **Gmail** (autonomous OTP pickup & receipt archival), **Google Drive**, and **Instant Bank Statement (Mono / Okra)** for on-request financial statements.

### J2 · Blocking 14-Step Conversational AI Onboarding Interview & Vision Extraction

1. After Connected Apps, the student enters the interactive **AI Onboarding Interview** (`docs/09-onboarding-discovery-interview-spec.md`).
2. Artrat asks for items **one after the other** (entertaining questions and freeform discussions at any step) and runs **Vision AI extraction** on every upload:
   - `[1]` **WAEC / O'Level Result** -> extracts distinctions & sitting details.
   - `[2]` **JAMB UTME Result Slip** -> extracts JAMB score (`308/400`) & registration number.
   - `[3]` **Admission Letter from School** (`University Admission Letter` — separate!).
   - `[4]` **Admission Letter from JAMB** (`JAMB CAPS Official Admission Letter` — separate!).
   - `[5]` **Form of School ID** (`University ID`, `Departmental ID`, or `Library Card`).
   - `[6]` **NIN Slip** -> extracts 11-digit NIN & verifies identity.
   - `[7]` **Passport Photograph** -> checks framing & resolution.
   - `[8]` **Bank Account Details** -> saves NUBAN & bank name (never asking for LGA Certificate or Bank Statement upfront).
   - `[9–10]` **Interactive CV Builder & Section Audit** -> accepts an existing CV upload or builds from scratch, carefully questioning each section (projects/labs, new certifications acquired since the last CV, leadership/volunteering).
   - `[11]` **Conversational Personal Statement & Community Roots** -> asks where the student comes from and what drives their mission.
   - `[12]` **Parents' Status & Work** -> asks if either parent is deceased (unlocking fatherless/orphan scholarships) and what work the living parent/guardian does.
   - `[13]` **School Fees Sponsor, Accommodation Sponsor & Disabilities** -> captures who pays tuition, who pays hostel/accommodation, and any disability with full context.
   - `[14]` **Academic Transcript / Statement of Result (Asked Last)** -> if the student objects that their transcript is incomplete, Artrat instructs them to have their **Departmental Exam Officer** compile and sign the semester results they currently have (even if it is just one semester); Vision AI extracts their current CGPA (`4.21/5.00`).
3. Upon completion, Artrat matches scholarships and prepares packages immediately.

### J3 · Tap an Application -> Ordered Chat Workspace + Gemini Canvas + Bidirectional Vault Sync

1. Tapping any curated Application opens its **Application Chat Workspace**.
2. Artrat presents all required documents and writeups **in the exact order demanded by the portal**:
   - **Document Cards:** Tap **Replace** right inside the chat to swap a file and sync it to the global **Vault** immediately.
   - **Writeup Cards:** Tap **Edit in Canvas** to open **Gemini Canvas**, where the student can edit text directly or ask Artrat to refine paragraphs grounded in their Evidence Ledger.
   - **Downloadable Submission Kit:** Compact pill buttons let the student download the prepared kit as **`.DOCX` (Word)** or **`.PDF`** at any time.

### J4 · Dynamic Missing Requirement -> Persistent Google Tasks & Calendar Loop

1. When a scholarship portal requires a physical endorsement (e.g., Academic Referee letter, Guarantor form, Mentor letter, or Departmental endorsement) or an on-request document (e.g., LGA Certificate or Bank Statement), Artrat places the request inside that Application Chat.
2. It triggers **Google Tasks** and **Google Calendar** reminders on a recurring schedule until the validated document is uploaded in Artrat.
3. There is **no manual "Mark Complete" bypass**—if the student marks the task done in Google Tasks without uploading the signed document in Artrat, Artrat automatically re-opens and re-triggers the Google Task.

### J5 · Drop a New Link in the Chatbox -> Enrich Autonomous Discovery

1. From the **Home** composer or the auto-hiding bottom chatbox on the **Applications** tab, the student pastes a scholarship URL they saw online or on social media.
2. Artrat crawls the URL, adds the provider and pattern to its **Autonomous Discovery Library**, checks binary eligibility, and either creates a new prepared Application or logs the exact disqualifying rule (e.g. First Class `4.50` required vs. `4.21`) in **Chat & Link History**.

### J6 · Declare & Submit -> 100% Autonomous Cloud Submission (with Gmail OTP Pickup)

1. Once every requirement in the Application Chat is `Ready`, the **Declare & Submit** card unlocks.
2. The student reviews the exact Declaration text and taps **Declare & Submit** once.
3. Artrat's cloud browser executes the submission end-to-end, automatically picking up any portal verification OTP from connected **Gmail**, and archives the official **Submission Confirmation Receipt** into the Application Chat and Vault.

---

## 4. Functional Requirements

Kept from S6 §7 with the following updates:

| ID | Requirement |
|----|-------------|
| **FR-01 Signup & Bio-Data** | DOB Date Picker, cascading 36 Nigerian States + FCT & 774 LGAs dropdowns, no upfront CGPA/UTME fields, clean residential address input |
| **FR-02 University Semester Engine** | Live university session/semester check (independent of static calendars), cached globally per school for autonomous level promotion, plus manual force-level override in Settings |
| **FR-03 14-Step AI Interview & Vision OCR** | Sequential one-by-one conversational onboarding interview with Vision extraction for WAEC, JAMB, separate School & JAMB Admission Letters, School/Dept/Library ID, NIN, Passport, Bank Details, CV audit, personal/family/disability story, and Transcript / Exam Officer sheet |
| **FR-05 Shared Catalogue & Claims** | Facts stored as Claims with verbatim Evidence and Verification level (ADR-0006) |
| **FR-07 Strict Binary Eligibility** | Hard eligibility rules must be 100% met after dry-run portal inspection; no fake match percentages |
| **FR-08 Dry-Run Portal Blueprint** | Portal inspected in safe dry-run mode before document preparation (`PortalBlueprint`) |
| **FR-10 Dynamic Vault & Persistent Tasks** | Dynamic document categories, bidirectional sync between Application Chat and Vault, and persistent Google Tasks/Calendar reminders (`manualCompletionAllowed = false` for signed documents) |
| **FR-13 100% Autonomous Execution & Gmail OTP** | Version-bound `Declare & Submit` triggers end-to-end cloud browser submission with automatic Gmail OTP pickup and receipt archival |
| **FR-19 Downloadable Submission Kit** | Compact `.DOCX` (Word) and `.PDF` download options for every prepared application |
| **FR-20 Evidence Sheet & Provenance** | Any catalogue or blueprint fact expands to its verbatim quoted Evidence and source URL |
| **FR-21 Link-Drop Discovery Enrichment** | Student-dropped links enrich the global Autonomous Discovery Library |
| **FR-22 Offline & Low-Data Tolerance** | Cached views of applications, Vault, and reminders on intermittent connections |

## 5. Non-Functional Requirements

- **Low-end Android & Mobile Web:** Cold start under 3 s on a 3 GB RAM device; responsive layout across compact mobile (`375px–430px`) and desktop (`>=860px`); auto-hiding sticky bottom bars on scroll so mobile screen real estate is never cramped.
- **Data cost:** Compact JSON payloads, lazy-loaded assets, and local caching.
- **Accessibility:** WCAG 2.2 AA contrast, semantic labels, dynamic type support, and icon + text status badges.
