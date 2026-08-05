# Git and Engineering Workflow

## 1. Design phase

`main` is the Engineering Design Repository. Documentation pull requests target `main`. No application scaffold, generated Prisma client, migration, deployment artifact or feature code is created until this roadmap is approved.

## 2. Implementation phase branches

- Create protected `develop` from the approved design commit.
- `feature/<issue>-<slug>`, `fix/<issue>-<slug>`, `docs/<issue>-<slug>` branch from and target `develop`.
- `release/<version>` stabilizes from `develop`; release PR targets `main`, then merge/tag and back-merge to `develop`.
- `hotfix/<issue>-<slug>` branches from `main`, returns to `main` and `develop`, and includes documentation reconciliation.
- Branches are short-lived; merge queue/squash merge produces a linear auditable history.

## 3. Commits and pull requests

Conventional commits: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `build`, `ci`, `chore`, `revert`. Each commit is focused and passing at its intended checkpoint. PR description includes roadmap task/requirements, change summary, test evidence, risk/rollback, screenshots/accessibility evidence where applicable, data/API/docs impact and security/privacy checklist.

## 4. Review ownership

- Product requirements/UX: Product owner + design reviewer.
- Architecture/ADR/package/API/data: architecture owner.
- Pricing: architecture + business pricing owner.
- Auth/privacy/security/CI/deployment: security/platform owner.
- Viewer: 3D owner plus accessibility/performance reviewer.
- Prompt/model changes: AI owner plus evaluation evidence.

At least one independent reviewer is required; high-risk paths require the listed owner. Authors cannot self-approve release gates.

## 5. Protected checks

Documentation links/Mermaid/OpenAPI; format/lint/type/dependency boundaries; unit/integration/contract/build; required E2E/accessibility/performance/security/AI evaluations; migration safety; preview deployment. Direct pushes and force pushes to `main`/`develop` are disabled. Required conversations must resolve.

## 6. Versioning and releases

Semantic versioning begins at `0.1.0` for first implementation milestone and `1.0.0` for approved MVP. Changesets document package/API impact. Release notes list features, fixes, migrations, compatibility/deprecation, known limitations and requirement evidence. Signed annotated tag and immutable deployment SHA identify production.

## 7. Documentation synchronization

Behavioral, API, data, pricing, AI, UX or operational changes update the corresponding normative document in the same PR. Architecture changes add/supersede an ADR. OpenAPI breaking changes follow deprecation/versioning rules. A reviewer rejects implementation that contradicts documentation unless the documentation change is explicitly approved.
