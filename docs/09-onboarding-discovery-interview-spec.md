# 09 — Onboarding, University Semester Intelligence & Interactive AI Interview Specification

**Status:** Active Specification (`apps/mobile`)  
**Scope:** End-to-end first-time student workflow, Bio-Data Profile, Autonomous University Semester & Level Promotion Engine, Connected Apps (including On-Request Bank Statement Connector), and Blocking Conversational AI Onboarding Interview with Vision Document Extraction.

---

## 1. Entry Workflow: Signup & Bio-Data First

1. **First Workflow on Visiting Artrat**:
   - When a student arrives on Artrat, the first workflow is **Sign Up / Sign In** (`Step 1`), followed by **Bio-Data & School Details** (`Step 2`), **Connected Apps** (`Step 3`), and the **Interactive AI Onboarding & Vault Interview** (`Step 4`), culminating in **Live Scholarship Matching & Package Preparation** (`Step 5`).

2. **Step 2: Student Bio-Data & School Details Form Rules**:
   - **Full Legal Name** (editable).
   - **Date of Birth (DOB) Date Picker**: Interactive Day / Month / Year date picker (never a plain text age string). Automatically computes the student's exact age and activates Under-18 NDPA privacy safeguards when age `< 18`.
   - **University / Institution & Course / Department**:
     - Selecting or entering a university triggers Artrat's **University Live Semester Check** (unless already cached for that university).
   - **Current Academic Level**: Selectable (`100 Level` through `600 Level`).
   - **Matriculation Number**: Student matriculation/registration number.
   - **State of Origin & Local Government Area (LGA) Dropdowns**:
     - **State of Origin**: Dropdown of all **36 Nigerian States + FCT (Abuja)**.
     - **Local Government Area (LGA)**: Cascading dropdown of all **774 official Nigerian LGAs** filtered by the selected State of Origin.
     - *Note*: The LGA **Certificate of Origin document** is **not** requested during initial onboarding because it is not required by every scholarship and students do not always have it at hand; it is requested on-demand when a specific scholarship requires it.
   - **No Upfront CGPA or JAMB UTME Score Input in Step 2**:
     - `Current CGPA` and `JAMB UTME Score` are **not** manually typed in the Step 2 Bio-Data form. Instead, Artrat extracts them via **Vision AI** when the student uploads their JAMB Result Slip and Academic Transcript / Statement of Result during the AI Onboarding Interview.
   - **Student Residential / Writing Address**:
     - Clean single input field for the student's hostel or residential writing address.
     - **Removed internal/unnecessary note**: Do **not** display the note *"Note: Referee, Guarantor, Mentor, or HOD addresses are never required upfront..."* inside the Student Profile form.

---

## 2. Autonomous University Semester Check, School Cache & Level Promotion

1. **Live University Semester Check (Independent of Printed School Calendars)**:
   - Nigerian universities frequently deviate from published academic calendars due to strikes, senate adjustments, or departmental scheduling.
   - When a student selects their university during signup, Artrat checks live university portal and departmental exam/session signals to determine which academic session and semester the institution is currently in (e.g., `2025/2026 Academic Session · 2nd Semester Active`).
2. **Global University Cache (Run Once Per School)**:
   - Once Artrat determines the current session and semester for a university (e.g., `University of Nigeria, Nsukka (UNN)`), that result is **cached globally for that university**.
   - Subsequent students signing up from the same university do **not** trigger another check—Artrat reuses the verified school semester record until the semester window transitions.
3. **Autonomous Student Level Promotion**:
   - Using the verified university semester state, Artrat automatically promotes the student's academic level (e.g., `200 Level → 300 Level`) when their university concludes 2nd Semester and begins a new academic session—with zero manual input required.
4. **Manual Level Override in Settings**:
   - In **Settings** (and accessible from **My Profile**), students have a dedicated **Academic Level & Autonomous Promotion Override** control where they can:
     - Inspect their university's cached semester status,
     - Toggle autonomous semester-based level promotion on/off, and
     - **Force-override and manually set a new academic level** (`100L`–`600L`) at any time without following the university semester tracker.

---

## 3. Connected Apps & On-Request Bank Statement Connector

1. **Core Student Connectors**:
   - **Google Tasks**: Daily 9:30 AM & 2:00 PM reminders for human-in-the-loop signatures or physical documents; re-opens tasks if checked off externally before uploading in Artrat.
   - **Google Calendar**: Blocks scholarship closing dates, aptitude tests, and interview windows.
   - **Gmail**: 100% autonomous pickup of portal verification codes (OTPs) during registration and submission, plus automatic archival of official submission receipts.
   - **Google Drive**: Imports student PDFs/scans and backs up Submission Kits and receipts.
2. **Bank Statement Connector (On-Request Financial Verification)**:
   - Scholarship portals occasionally require a certified 3-month or 6-month **Bank Statement** (either the student's or sponsor/parent's statement).
   - Because a Bank Statement is **not** a universal requirement for every scholarship, Artrat does **not** demand a bank statement upload during initial onboarding (only bank account details for disbursement).
   - However, Artrat provides a dedicated **Instant Bank Statement Connector (Mono / Okra Open Banking)** in **Connected Apps** (both in Onboarding Step 3 and in the Connected Apps page) so that whenever a specific scholarship requests a bank statement, Artrat can either pull a verified PDF bank statement on-request via the connector or prompt the student to upload one for that application.

---

## 4. Step 4: Blocking Conversational AI Onboarding Interview & Vision Extraction

After completing **Connected Apps** (`Step 3`), clicking continue is **gated by an interactive, one-by-one AI Interview Chat** before entering the main workspace.

### 4.1 Interaction Principles
- **Sequential One-by-One Pacing**: Never dump all document requests or questions at once (which overwhelms and tires the student). Artrat asks for **one item or topic at a time**.
- **Interactive Freeform Discussion**: The student can ask questions, raise objections, or discuss edge cases at any step (e.g., *"Why do you need both admission letters?"*, *"I only have my library card"*, *"My transcript isn't complete"*), and Artrat responds conversationally before advancing.
- **Vision AI Extraction on Every Upload**: Whenever the student uploads a document, Artrat runs Vision OCR/verification, displays the extracted fields inline in the chat, and saves both the file and extracted facts to the student's **Vault**.

### 4.2 Sequential Document Collection (Distinct & Unmerged)
1. **WAEC / O'Level Result**:
   - Student uploads WAEC/NECO result PDF or image.
   - Vision extracts subject grades (e.g., 5+ A1/B2 distinctions including English, Mathematics, Physics, Chemistry), exam number, and sitting year into Vault.
2. **JAMB UTME Result Slip**:
   - Student uploads original JAMB result slip.
   - Vision extracts **JAMB UTME Aggregate Score** (e.g., `308 / 400`), JAMB Registration Number, and subject combination scores—populating the student's profile automatically.
3. **Admission Letter from School (University Admission Letter)**:
   - Stored as a **separate, distinct document** (`University Admission Letter`).
   - Vision extracts Institution, Faculty, Department (`Electrical Engineering`), entry mode, and academic session.
4. **Admission Letter from JAMB (JAMB CAPS Admission Letter)**:
   - Stored as a **separate, distinct document** (`JAMB Admission Letter`)—**never merged** with the University Admission Letter because Nigerian scholarship portals (e.g., Shell SPDC, TotalEnergies, PTDF, FSB) frequently have separate upload slots for the School Admission Letter and the JAMB Admission Letter.
   - Vision extracts JAMB CAPS reference, institution match, and course match.
5. **Form of School ID (University ID, Departmental ID, or Library Card)**:
   - Artrat explicitly accepts **School ID Card**, **Departmental ID Card**, or **University Library Card** (since many 100L/200L students receive Departmental or Library IDs before permanent plastic university ID cards are printed).
   - Vision extracts ID card type, Matriculation Number, Department, and student name.
6. **NIN Slip (National Identification Number)**:
   - Student uploads NIN slip or improved NIN card.
   - Vision extracts the 11-digit NIN and cross-checks legal name and date of birth.
7. **Passport Photograph**:
   - Student uploads a passport photo.
   - Vision verifies background clarity, framing, and resolution.
8. **Bank Account Details (Disbursement Details — Not Bank Statement)**:
   - Student provides Bank Name, 10-digit NUBAN Account Number, and Account Name.
   - *Note*: Neither **LGA Certificate of Origin** nor **Bank Statement** is requested here; both are requested only when a specific scholarship requires them.

### 4.3 Interactive CV Builder (From Scratch or Upload + Section-by-Section Questioning)
9. **CV Intake & Section-by-Section Probe**:
   - Student can either **upload an existing CV** (Vision parses existing sections) or **build their CV from scratch** with Artrat.
   - Even if an existing CV is uploaded, Artrat **carefully questions each section one by one**:
     - *Academic Projects & Laboratory Work* (e.g., workshops, prototypes, class rank),
     - *Certifications & Courses* (specifically asking if they have acquired new certifications, bootcamps, or technical skills not yet on their old CV),
     - *Leadership, Volunteering & Work Experience* (e.g., student society roles, community service, internships).
   - All verified answers are saved into the student's **Master Scholarship CV** and **Achievement Ledger**.

### 4.4 Conversational Personal Statement, Roots & Family/Financial Context
10. **Personal Statement & Community Origin Story (Conversational Framing)**:
    - Framed as a natural conversation rather than a rigid form:
      - Asks **where the student comes from** (their hometown/community environment and upbringing story) and what real-world experience inspired their course of study.
      - Asks about their **long-term mission and career goals** after graduation.
11. **Parents' Status & Occupation (Orphan / Fatherless / Indigent Opportunity Matching)**:
    - Gently asks whether both parents are living or if either parent (father, mother, or both) is deceased—enabling Artrat to match opportunities that prioritize fatherless or orphaned students and weave their family resilience authentically when appropriate.
    - Asks about the **living parent(s)' or guardian's occupation/work**.
12. **Tuition & Accommodation Sponsorship**:
    - Asks **who pays the student's school fees** and **who pays for their hostel/accommodation**, capturing accurate financial-need context for bursaries and need-based essays.
13. **Disability & Accessibility Context**:
    - Asks whether the student has any physical, visual, hearing, or health disability, inviting them to explain their state thoroughly in their own words so Artrat can match disability-inclusive awards and represent their story accurately.

### 4.5 Final Step: Academic Transcript / Statement of Result (With Incomplete-Result Objection Handling)
14. **Transcript / Statement of Result**:
    - Asked **last** in the interview.
    - **If the student objects that their results or transcript are not complete yet**:
      - Artrat instructs them clearly: *"Even if all your results are not complete yet, please ask your **Departmental Exam Officer** to compile and sign the semester results you currently have—**even if it is just one semester**—and upload that compiled sheet here."*
    - When the student uploads their compiled result sheet (or existing semester statement of result), Vision AI extracts their **Current CGPA** (e.g., `4.21 / 5.00`) and course grades, saving them to their Profile and Vault.
    - Completing this step unlocks the **Live Scholarship Match & Application Preparation** stage.
