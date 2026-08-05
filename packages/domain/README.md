# Domain package

`@ai-estimate-studio/domain` is the dependency-inward core of the application. It contains branded identifiers, bounded integer money, locale and revision value objects, immutable entity snapshots, lifecycle state machines, and ports for persistence and external providers.

The package deliberately has no React, Next.js, Prisma, network, filesystem, provider-SDK or environment imports. Adapters in `packages/db` and `packages/providers` implement the interfaces exported from `src/shared/ports.ts`; application services compose them behind transaction boundaries.

Money is represented as signed 64-bit integer minor units plus an uppercase ISO-like three-letter currency code. Published revisions and issued quote snapshots are modeled as immutable values; optimistic updates carry a positive `Version` and must validate the expected version before persistence.

All lifecycle changes must pass the corresponding transition function from `src/state-machines.ts`. Invalid transitions and invariant failures are typed domain errors, making them mappable to stable API problem codes without exposing infrastructure details.
