# Artrat

**Artrat gets a student from "I don't know what I qualify for" to "submitted, on time, with proof", and does the work while they sleep.**

Artrat is an autonomous AI scholarship agent for students. It discovers and verifies scholarships across the web and social media, inspects target portals in a safe dry run before touching student documents, checks strict binary eligibility, prepares all writeups and documents in exact portal sequence, triggers persistent Google Tasks and Calendar reminders for any required human signatures (such as a referee, mentor, guarantor, or departmental endorsement), picks up verification OTPs autonomously via Gmail, and executes the submission end-to-end after one student approval: **Declare & Submit**.

> Status: **Phases P0–P6 complete and verified end-to-end (`apps/mobile`, `backend/`, `browser/`, `contract/`, `infra/`).**

## Read in this order

| Doc | What it answers |
|-----|-----------------|
| [00 · Source review](docs/00-source-review.md) | What the six original `.docx` files say, where they conflict, and how this repo resolves them |
| [01 · Strategy](docs/01-strategy.md) | Portal-first inspection, dynamic Vault, autonomous university semester engine, and end-to-end execution |
| [02 · Product spec](docs/02-product-spec.md) | Personas, core journeys (J1–J6), functional & non-functional requirements |
| [03 · Architecture](docs/03-architecture.md) | System shape, stack, process roles, repository layout, contract, and deployment |
| [04 · Domain model](docs/04-domain-model.md) | Bounded contexts, Claims, Portal Blueprint, University Semester Cache, Dynamic Vault, and lifecycles |
| [05 · Discovery agent](docs/05-discovery-agent.md) | The autonomous research frontier, priority scoring, Thompson-sampling adaptation, guardrails, and link-drop enrichment |
| [06 · Trust and security](docs/06-trust-safety-security.md) | Data classes, trust boundaries, enforced rules, writing integrity, and under-18 NDPA 2023 compliance |
| [07 · Roadmap](docs/07-roadmap.md) | Phases P0–P6 with verifiable exit gates |
| [08 · Frontend plan](docs/08-frontend-plan.md) | Visual architecture, open-plane shell, screens, signature components, state coverage, and mock contract |
| [09 · Onboarding & AI Interview spec](docs/09-onboarding-discovery-interview-spec.md) | First-time signup, bio-data (DOB picker, 36 States + 774 LGAs), live university semester check, connectors, and 14-step Vision AI interview |
| [Open questions](docs/open-questions.md) | Resolved product decisions and remaining open questions |
| [GLOSSARY](GLOSSARY.md) | The project's shared domain vocabulary |
| [ADRs](docs/adr/) | Hard-to-reverse architectural decisions and their consequences |

## Non-negotiables

1. **Every scholarship fact is a Claim** carrying its verbatim source passage, URL, retrieval timestamp, and verification level.
2. **Dynamic AI agent, never static:** The Vault, document checks, and endorsement requests adapt dynamically to whatever a scholarship portal demands.
3. **Distinct academic documents:** School Admission Letter (`University Admission Letter`) and JAMB Admission Letter (`JAMB CAPS Official Admission Letter`) are never merged.
4. **Zero fabricated facts:** Artrat never invents a student's grades, projects, family background, or experiences; every essay claim maps to the student's Evidence Ledger.
5. **100% autonomous OTP pickup via Gmail:** Connected Gmail handles portal verification codes and official submission receipts automatically without asking the student to type OTPs manually.
6. **One version-bound approval (`Declare & Submit`):** Bound to the exact package hash and declaration text reviewed by the student, with downloadable Submission Kits (`.DOCX` + `.PDF`) always available.

## Running the backend (P2)

Needs [uv](https://docs.astral.sh/uv/). No Docker is required for local work.

```powershell
cd backend
uv sync                                   # installs Python 3.12 deps, incl. Scrapling (ADR 0007)
uv run pytest                             # tests run against an embedded Postgres 16
$env:ARTRAT_DATABASE_URL = (uv run python scripts/dev_db.py)   # persistent local Postgres
uv run artrat migrate
uv run artrat agent fetch https://www.chevening.org/scholarships/
uv run artrat api                         # http://localhost:8000/docs
```

Browser worker (browser-use, ADR 0007), needed for `artrat agent fetch --render <url>`:

```powershell
cd browser
uv sync
$env:ARTRAT_BROWSER_EXECUTABLE = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
uv run artrat-browser                     # http://localhost:8090
```

Full stack with containers: `cd infra; cp .env.example .env; docker compose --env-file .env up --build`.

## Source material

The original planning documents (`Artrat_*.docx`, `ScholarPilot_*.docx`) remain at the repository root as historical input. Where they disagree with `docs/`, `docs/` wins, and [00 · Source review](docs/00-source-review.md) explains why.
