# ADR-0002: Use PostgreSQL and Prisma for every environment

## Status
Proposed

## Context
Catalog revisions, dependencies, pricing publication, quote snapshots, tenant isolation and audit require relational constraints and transactions. SQLite behavior differs from production and weakens integration confidence.

## Decision
Use PostgreSQL locally, in CI, Docker and production. Use Prisma for schema, migrations and type-safe adapters. Production uses managed PostgreSQL with connection pooling and a separate direct migration URL.

## Consequences
Development requires Docker or an external PostgreSQL instance, but environment parity improves. JSONB remains limited to versioned rule/snapshot payloads whose schemas are validated in application code.

## Alternatives considered
SQLite is simpler for a demo but diverges in types, constraints and concurrency. Document databases complicate integrity and transactional snapshots. Direct SQL offers control but increases initial data-layer work without a demonstrated need.

