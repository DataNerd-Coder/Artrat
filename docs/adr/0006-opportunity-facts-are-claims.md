---
status: proposed
---

# Opportunity facts are stored as Claims with Evidence

Every factual field on an Opportunity is stored as a Claim: value (or null), Verification level, verbatim Evidence passages with URL and retrieval time, and last-verified time. Plain columns would be simpler, but honest confidence and provenance are the product's core promise, and retrofitting provenance onto plain columns later means re-crawling everything. The cost is a heavier schema and UI that must render verification everywhere; we accept it.

## Consequences

- The model may never fill an unknown field; null plus a verify task is the only path.
- Evidence passages must string-match the stored snapshot, enforced in code.
