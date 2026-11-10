---
status: proposed
---

# Containers first; Docker Compose is the canonical deployable

S1 asks for a one-ZIP, one-command deployment; S6 targets Azure-native services. We ship container images plus a Compose file as the reference deployment, and avoid cloud-proprietary services (Durable Functions, Notification Hubs) in domain code. Any container platform, Azure Container Apps included, can run the same images with managed Postgres and object storage swapped in by configuration.
