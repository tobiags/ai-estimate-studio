# ADR-0001: Use a modular TypeScript monolith

## Status
Proposed

## Context
The product has catalog, configuration, pricing, viewer, AI, quote and admin capabilities, but initial scale and team boundaries do not justify distributed services. Transactional quote issue spans several modules.

## Decision
Use a pnpm/Turborepo workspace containing a Next.js web app, a job-runner entry point and strongly bounded packages. Deploy stateless processes independently while retaining one codebase and database.

## Consequences
Simple transactions, local development and refactoring are favored. Package dependency rules are mandatory to prevent a tightly coupled monolith. Independent service scaling requires later extraction behind existing ports.

## Alternatives considered
Microservices add network, consistency and operational cost prematurely. A single unstructured Next.js app would be initially fast but would not protect pricing/viewer/domain boundaries.

