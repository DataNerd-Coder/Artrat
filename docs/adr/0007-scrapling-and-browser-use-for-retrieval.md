---
status: accepted
---

# Scrapling fetches pages; browser-use drives the isolated browser worker

The discovery agent needs two retrieval tools: a fast static fetch with HTML parsing, and a real browser for JS-heavy pages and the dry-run Portal Inspector. We use **Scrapling** for the first (inside the backend image) and **browser-use** for the second (inside the separate `browser/` image). Both are installed from the owner's forks, `DataNerd-Coder/Scrapling` and `DataNerd-Coder/browser-use`, and pinned by commit in `uv.lock`. We consume the forks read-only and never push to them from this project. This replaces Crawl4AI and raw Playwright in `03-architecture.md`.

## Considered Options

- Crawl4AI + raw Playwright (original plan): two more frameworks overlapping the same jobs; rejected in favour of the owner's chosen tools.
- browser-use for everything: a full browser per static fetch is slow and costly; rejected.

## Consequences

- browser-use pins exact versions of pydantic, httpx and others, so it lives in its own package and image and never shares a dependency set with the backend.
- browser-use telemetry and cloud sync are switched off by environment in the image. Default extensions are disabled. The built-in captcha solver and automatic PDF download are on (owner's decision); downloaded PDFs land inside the throwaway profile and are deleted with it.
- Each render gets a fresh, throwaway browser profile, so no cookies or sessions cross jobs. The worker holds no database credentials.
- Every URL, including each redirect hop, must pass the public-address guard before the agent or the worker contacts it.
