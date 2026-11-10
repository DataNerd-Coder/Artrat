---
status: accepted
---

# Build the frontend first against a typed mock API

The student app is built and user-tested on a MockArtratApi with realistic fixtures before the backend exists. Screens depend only on the ArtratApi interface and Zod domain schemas; these become the OpenAPI contract when the backend starts. This finds UX problems at the cheapest point, and the contract is shaped by real screens rather than guessed. The cost is a deliberate contract freeze step at the start of Phase 2.
