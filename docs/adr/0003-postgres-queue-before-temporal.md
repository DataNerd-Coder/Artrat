---
status: proposed
---

# Postgres-backed job queue before Temporal

Durable execution is required (weeks-long waits for signed documents, retries, schedules). We start with a Postgres-backed queue (Procrastinate or equivalent) and explicit state machines in our own tables, rather than Temporal or Azure Durable Functions. It keeps one database as the source of truth and avoids running a workflow cluster before load justifies it. Revisit when workflows need complex compensation, replay debugging, or the queue becomes a bottleneck.
