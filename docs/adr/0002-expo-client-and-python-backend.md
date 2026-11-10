---
status: proposed
---

# Expo client for all platforms, Python for the whole backend

The sources propose Next.js, React Native, TypeScript services, and a Python agent at the same time. We use Expo (React Native) for iOS, Android, and web from one codebase, and Python (FastAPI + workers) for the API and the agent. The discovery and extraction ecosystem (Playwright, Crawl4AI, Docling, Pydantic) is Python, so one backend language keeps domain types in one place; the client gets generated TypeScript types from the OpenAPI contract.

## Considered Options

- TypeScript API + Python agent (S6/S5): two backend runtimes sharing one domain; rejected for duplicated models.
- All TypeScript (Stagehand, Node workers): weaker PDF and extraction tooling; rejected.
- Separate Next.js web app: rejected for P1; Expo web covers desktop use. Revisit for an admin console.
