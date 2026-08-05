# ADR-0003: Use a contract-first versioned REST API

## Status
Proposed

## Decision
Define `/api/v1` resources in OpenAPI 3.1 before route implementation. Use JSON camelCase, cursor pagination, RFC 7807 problems, idempotency keys for issue/upload completion, and optimistic version fields for admin edits.

## Consequences
Public and internal clients share stable contracts and mocks. Contract maintenance is required. Server actions may improve same-app UX but must call the same application services and cannot replace documented endpoints.

## Alternatives considered
GraphQL is unnecessary for the bounded access patterns and complicates caching/authorization. Server-actions-only design lacks an explicit reusable contract.

