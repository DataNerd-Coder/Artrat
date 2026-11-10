# 00 · Source review: what the six documents say, where they disagree, and what they get wrong

This file reviews the six `.docx` files at the repository root. It is the evidence base for every other document in `docs/`. When a later doc departs from a source, it points back here.

| # | File | What it is | Weight |
|---|------|-----------|--------|
| S1 | `Artrat_Autonomous_Discovery_System.docx` | Short architecture note for a persistent discovery agent, one-ZIP deployment | Medium |
| S2 | `Artrat_Autonomous_Discovery_System_Exact_Answer.docx` | Near-duplicate of S1 in chat-answer form | Low (duplicate) |
| S3 | `Artrat_Autonomous_Discovery_Tools_Strict_Copy.docx` | Tool selection for the discovery agent (Temporal, SearXNG, Crawl4AI, Playwright, Docling, Postgres/pgvector) | High for discovery |
| S4 | `ScholarPilot_Open_Source_Architecture_and_Implementation_Plan.docx` | OSS reuse plan, first edition | Superseded by S5 |
| S5 | `ScholarPilot_Open_Source_Architecture_and_Implementation_Plan_UPDATED.docx` | S4 plus a repo-by-repo audit register and extraction rules | High for build-vs-reuse |
| S6 | `ScholarPilot_PRD_and_Technical_Architecture-1.docx` | Full PRD and technical design (v0.1, 24 Oct 2026) | Highest for product |

## 1. What the sources agree on

These points are consistent across the documents and are kept as non-negotiable in this repo.

1. **The agent does the work; the student authorises it.** Discovery, matching, preparation, and follow-up run in the cloud while the phone is off.
2. **Discovery is shared and the workflow is private.** One global opportunity catalogue; eligibility, documents, and applications belong to each student.
3. **Evidence over fluency.** Every scholarship fact keeps its source URL, passage, and retrieval time. A polished record is not an accurate record (S3 §2C).
4. **Honest confidence.** Separate confirmed, corroborated, inferred, and unknown facts (S3 §9C). Model confidence never replaces verification.
5. **No fabrication, no bypass.** The agent never invents personal facts and never defeats CAPTCHAs, MFA, or anti-bot controls (S6 §4).
6. **One approval gate.** Declare & Submit, bound to the exact package version and declaration text (S6 §17).
7. **Idempotency everywhere.** Stable keys for tasks and calendar events. Verify before any retry of an uncertain submission (S6 §18.4).
8. **Signed-document requirements cannot be manually ticked off.** A missing HOD letter stays open until a signed upload passes checks (S6 §6.7).
9. **Adaptation through recorded outcomes, not model retraining** (S1 §3).
10. **Untrusted inputs.** Web pages, PDFs, emails, and uploads are data, never instructions (S3 §9B, S6 §21.2).
11. **Own the core, reuse the edges.** Product state, approvals, and trust boundaries are Artrat's code. OSS is reused at component level after audit (S5 Addendum G).

## 2. Where the sources contradict each other

| Topic | S1/S3 (Artrat) | S5 (OSS plan) | S6 (PRD) | Resolution |
|-------|---------------|---------------|----------|-----------|
| Product name | Artrat | ScholarPilot | ScholarPilot | **Artrat** is the product. ScholarPilot is the earlier working name. See `open-questions.md` Q1. |
| Primary client | Next.js dashboard | React Native | React Native + Expo | **Expo (iOS, Android, web)** from one codebase. ADR-0002. |
| Hosting | Self-host, Docker Compose, one ZIP | Azure "viable" | Azure (Container Apps, Durable Functions, Blob, Key Vault) | **Containers first.** Compose is the canonical deployable; any cloud runs the same images. ADR-0004. |
| Backend language | Python agent + Next.js API | TypeScript backend | TypeScript services | **Python backend** (API + workers) and a TypeScript client. ADR-0002. |
| Workflow engine | Temporal | Durable queue first, Temporal later | Durable Functions or Temporal Cloud | **Postgres-backed job queue first**, Temporal when proven necessary. ADR-0003. |
| Agent framework | Custom planner (LangGraph optional) | LangGraph | Not specified | **Custom planner** over an explicit task frontier. LangGraph is not adopted by default. `05-discovery-agent.md`. |
| Model provider | OpenRouter | Claude API | Microsoft Foundry | **Provider-agnostic gateway**, OpenRouter as the default route. |
| Browser automation | Playwright (Python), Crawl4AI | Stagehand (TS) + Playwright | Playwright workers | **Playwright (Python)** for discovery reads. Portal execution stack is chosen by benchmark at Phase 6. |
| State machine | none | 8 states | 16 states mixing catalogue, match, and application concerns | **Three separate lifecycles**: Opportunity, Match, Application. `04-domain-model.md`. |

## 3. Judgement: strengths

- **S6 is a strong PRD.** Its trust model (version-bound approval, verify-before-retry, idempotent tasks, signed-document rule) is better than most production systems. Keep it.
- **S3 correctly identifies the hard part of discovery:** search is not discovery. Link following, revisit schedules, deduplication, budgets, and stopping rules are what make an agent persistent.
- **S5's disposition vocabulary** (EXTRACT / MODEL / DEPLOY / REFERENCE / BENCHMARK / REJECT) is a sound way to stop dependency sprawl.

## 4. Judgement: weaknesses and risks

1. **The headline promise is the riskiest feature.** "Tap and sleep" autonomous submission depends on per-portal adapters, portal terms that often forbid third-party completion, CAPTCHAs, OTPs, and legal declarations that the applicant must personally make. It is also the least reusable work: every portal is a one-off. S6 puts it in the MVP. **This repo moves it to a later phase behind an allowlist** and makes the universally legal path (a prepared Submission Kit) the default. See `01-strategy.md`.
2. **Two products are fused without a seam.** S1–S3 describe a discovery engine that would be valuable on its own. S5–S6 describe an application-completion app. They have different users (the catalogue has no user; the app has students), different scaling curves, and different failure costs. They need an explicit boundary: the **Catalogue** context and the **Student** context.
3. **Per-student discovery does not scale.** S1 seeds research "based on the student's education level, field, nationality and goals". Running an autonomous crawl per student multiplies cost by user count. Better: global discovery driven by **aggregate demand** across profiles, plus targeted research only when a profile's coverage is thin.
4. **The single state machine mixes owners.** S6 §16 puts `DISCOVERED` (a catalogue fact) and `SUBMITTED` (a student workflow fact) in the same enum. That creates split ownership: the discovery worker and the application workflow both write one field.
5. **Too many runtimes and frameworks at once.** Summed across sources: Next.js, React Native, TypeScript services, Python agent, Temporal, Durable Functions, LangGraph, Stagehand, Browser Use, Crawl4AI, Scrapy, Docling, Unstructured, Mem0, Graphiti. Every framework is reasonable alone; together they overwhelm a small team. This repo picks one per responsibility.
6. **No user research, market sizing, or business model.** The docs never say who pays, what a completed application costs to produce (LLM tokens, browser minutes), or which students come first. The Nigerian context (JAMB, HOD letters, CGPA) is implied but never stated.
7. **Minors are not addressed.** JAMB candidates and secondary-school leavers are often 16–17. Consent, parental involvement, and data-protection duties change for minors.
8. **Distribution and notification channels assume Google.** Gmail and Calendar are central in S6. Many target students rely on WhatsApp and SMS more than calendar apps. This needs validation, not assumption.
9. **No frontend or UX specification.** S6 names screens in passing but defines no information architecture, states, or interaction design. `08-frontend-plan.md` fills this gap.

## 5. What this repo keeps, changes, and adds

- **Kept:** all of section 1; S6's domain entities and Declare & Submit transaction; S3's discovery loop and memory types; S5's audit discipline.
- **Changed:** submission strategy (readiness-first), state machines (split into three), stack (one choice per responsibility), discovery (demand-driven and global).
- **Added:** Claim-based provenance as a first-class data shape; Submission Kit; Readiness as the core metric; a frontend plan; explicit open questions on market, minors, channels, and business model.
