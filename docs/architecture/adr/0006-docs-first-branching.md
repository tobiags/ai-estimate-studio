# ADR-0006: Use documentation-first branch governance

## Status
Accepted

## Decision
During design, `main` is the approved engineering design repository. After roadmap approval, create `develop` for implementation integration. Feature and fix branches target `develop`; release pull requests merge verified code and updated documentation to `main`.

## Consequences
Implementation cannot silently define product behavior. Documentation review is an explicit delivery gate. Urgent production fixes still require a follow-up documentation reconciliation when behavior changes.

