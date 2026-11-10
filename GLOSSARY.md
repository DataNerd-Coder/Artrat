# Artrat Glossary

Artrat is an autonomous AI scholarship agent for students. It discovers and verifies funding opportunities, inspects application portals, determines strict eligibility, prepares every required document and writeup in portal sequence, chases missing third-party endorsements via persistent connectors, and submits applications end-to-end after the student's single **Declare & Submit** approval.

## Catalogue

**Opportunity**:
One funding programme for one application cycle, such as a scholarship, grant, fellowship, or bursary.
_Avoid_: Scholarship (as a generic database table name), listing, offer

**Provider**:
The organisation that funds or administers an Opportunity.
_Avoid_: Sponsor, funder, organisation

**Portal Blueprint**:
The versioned map of a target scholarship portal produced by Artrat's safe dry-run inspector before preparing student documents: exact form fields, file upload slots, format/size caps, essay prompts, declarations, and automation policy.
_Avoid_: Form schema, scrape result

**Requirement**:
A hard criterion, document, writeup, or third-party endorsement that an Opportunity demands from applicants.
_Avoid_: Condition, prerequisite

**Claim**:
A single fact about an Opportunity or Portal Blueprint together with its verbatim evidence and verification level.
_Avoid_: Field, attribute, data point

**Evidence**:
A verbatim quoted passage from a Source that supports a Claim, with its URL and retrieval time.
_Avoid_: Citation, proof, reference

**Verification**:
How strongly a Claim is supported: `official`, `corroborated`, `inferred`, `unknown`, or `conflicting`.
_Avoid_: Confidence, certainty, trust score

**Source**:
A web page, portal screen, PDF, or social post that Artrat has read or plans to read.
_Avoid_: Site, link, page

## Research

**Lead**:
An unverified pointer, found during web/social research or student link-drop, to a possible Opportunity or Provider.
_Avoid_: Candidate, hit, result

**Research Direction**:
A family of searches or explorations whose yield and cost Artrat tracks over time.
_Avoid_: Query, strategy, campaign

**Research Task**:
One unit of discovery or portal-inspection work (`search`, `fetch`, `render`, `extract`, `explore`, `verify`, `revisit`, `expand_provider`) waiting in the agent's frontier queue.
_Avoid_: Job, step, action

**Demand Signal**:
An anonymised aggregate of what active Students need (study levels, courses, states, special circumstances), used to steer global discovery.
_Avoid_: Student query, user request

## Student & University Intelligence

**Student**:
A person using Artrat to qualify for, prepare, and submit Opportunities (including under-18 university undergraduates).
_Avoid_: User, applicant, candidate

**University Semester Cache**:
Artrat's globally cached record of a university's live academic session and active semester (`1st Semester`, `2nd Semester`, or `Session Break`), verified from live portal/departmental exam signals independent of static printed school calendars, used to autonomously promote student academic levels across sessions.
_Avoid_: Static school calendar

**Profile Fact**:
One piece of structured information about a Student, labelled by origin: `self_reported`, `document_extracted` (via Vision AI), or `verified`.
_Avoid_: Profile field, attribute

**Vault**:
A Student's dynamic, private store of uploaded and generated documents, extracted facts, CV sections, and personal background stories. New document types demanded by any scholarship portal are dynamically added to the Vault and synced globally across all applications.
_Avoid_: Fixed file list, static uploads

**Onboarding AI Interview**:
The sequential, one-by-one conversational interview after connector setup where Artrat collects core documents with Vision OCR extraction, builds or audits the student's CV section by section, learns their personal statement and family/sponsorship/disability story, and captures their transcript or Exam Officer-compiled result sheet.
_Avoid_: Static intake form

**Match**:
Artrat's strict binary assessment of one Student against one Opportunity's hard eligibility rules and obtainable requirements.
_Avoid_: Percentage match score, award odds

**Verdict**:
The outcome of a Match: `eligible`, `likely`, `missing`, or `ineligible`.
_Avoid_: Match percentage, probability

**Application**:
A Student's curated pursuit of one Opportunity, presented as an interactive **Application Chat Workspace** ordered by the Portal Blueprint.
_Avoid_: Static form, ticket

**Checklist Item**:
One Requirement being satisfied for one Application, keyed stably by `applicationId + requirementRef`.
_Avoid_: Requirement instance, to-do

**Readiness**:
The count of an Application's required Checklist Items that are satisfied (e.g. `5 of 5 items ready`).
_Avoid_: Match score

**Task**:
An action a Student must take for a missing physical requirement (such as uploading a signed endorsement letter from a referee, academic mentor, guarantor, or HOD), synced to **Google Tasks** and **Google Calendar** on a recurring trigger loop until validated in-app.
_Avoid_: Manual tick-box

**Draft**:
An essay, personal statement, or endorsement request letter written by Artrat in exact portal word limits, grounded in the Student's **Evidence Ledger** and editable in **Gemini Canvas**.
_Avoid_: Unverified AI text

**Evidence Ledger**:
The verified facts, achievements, family/community background, and document references a Draft is permitted to use.
_Avoid_: Prompt notes

**Voice Profile**:
A Student's editable writing tone and cadence preferences used to keep Drafts authentic.
_Avoid_: Persona

## Submission

**Package**:
The frozen, versioned snapshot of all portal answers, writeups, and Vault document versions prepared for one Application, identified by a content hash.
_Avoid_: Bundle

**Declaration**:
The exact portal affirmation text a Student reviews and accepts when approving a Package.
_Avoid_: Generic terms

**Declare & Submit**:
The single student approval bound to one Package version hash and Declaration that launches autonomous cloud submission.
_Avoid_: Submit button

**Submission Mode**:
How an approved Package reaches the Provider: **Autonomous** (default whenever a portal does not explicitly ban automation, including automatic Gmail OTP pickup) or **Self / Submission Kit** (when a portal explicitly prohibits automation or when the student downloads the package in `.DOCX` or `.PDF`).
_Avoid_: Channel

**Submission Kit**:
Downloadable `.DOCX` (Editable Word Document) and `.PDF` (Print-Ready Package) bundle plus copy-ready answers and renamed files for any prepared Application.
_Avoid_: Raw export

**Human Step**:
A step during portal execution that only the Student can personally perform, such as a biometric/CAPTCHA challenge, fee payment, or wet-ink endorsement upload—never routine email OTPs, which Artrat picks up autonomously via the Gmail connector.
_Avoid_: Manual OTP prompt

**Submission**:
An execution run that delivers an approved Package to the portal and archives the official confirmation receipt in the Vault and Application Chat.
_Avoid_: Attempt
