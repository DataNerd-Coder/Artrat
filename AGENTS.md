# Artrat Project Rules & Skill Routing

## Source of truth
- Read `README.md`, then the relevant file in `docs/`, before planning or coding. `docs/` overrides the root `.docx` files.
- Use the vocabulary in `GLOSSARY.md`. Record hard-to-reverse decisions in `docs/adr/`.
- Current phase: **P2 Catalogue & Discovery backend** (`docs/07-roadmap.md`, `docs/05-discovery-agent.md`). P1 frontend is closed. Retrieval uses Scrapling and browser-use (ADR 0007).

When working on **Artrat**, judiciously select and activate the installed skills in `.agents/skills/` based on the current phase of work rather than loading unrelated skills at once:

## 1. Planning, Specs & Architecture
- **Clarifying & Stress-Testing Plans**: Use `grill-with-docs` or `grill-me` (`mattpocock/skills`) to surface edge cases and document decisions, then `to-spec` and `to-tickets` to structure implementation.
- **System & Module Design**: Use `architect`, `codebase-design`, `domain-modeling`, and `how` / `why` (`pstack` & `mattpocock/skills`) before locking in module boundaries or data models.
- **Codebase Mapping**: Use `graphify` when navigating or mapping project architecture and file relationships.

## 2. React Native, Mobile & UI/UX Execution
- **React Native / Expo Development**: Always consult `react-native-patterns` (`ECC`), `react-patterns`, `react-performance`, and `typescript-best-practices` (`pstack`) when writing mobile screens, navigation, state, and data layers.
- **Mobile UI Craft & Platform Polish**: Use `apple-design-skill` (Apple HIG & cross-platform mobile UI review), `liquid-glass-design`, `swiftui-expert-skill`, and `swiftui-pro` when designing or reviewing iOS/mobile UI, animations, typography, and layout hierarchy.
- **Web / Component Surfaces**: Use `21st-registry` (`21st-dev` CLI & component library), `taste-skill` (`design-taste-frontend`), `frontend-design-direction`, and `shadcn` when building web surfaces, 3D playful light-purple UI components, or dashboards so UI is bold, intentional, and never generic.

## 3. Engineering Discipline, Testing & Security
- **Rigorous Execution (`pstack`)**: Apply `poteto-mode` principles (`principle-model-the-domain`, `principle-boundary-discipline`, `principle-fix-root-causes`, `principle-prove-it-works`, `unslop`) to keep code simple, verifiable, and free of AI slop.
- **Testing & Verification**: Use `tdd` / `tdd-workflow`, `react-testing`, `verification-loop`, and `pstack` QA workflows to verify behavior before declaring work complete.
- **Security**: Use `never-get-hacked`, `security-review`, and `agent-security-hardening` whenever handling auth, API keys, user input, network boundaries, or pre-deployment checks.
