# Quality Engineering Strategy

**Status:** Proposed normative strategy

## 1. Quality gates

Every pull request must pass formatting, lint, strict type checking, dependency-boundary checks, unit/integration tests, OpenAPI/docs validation and build. Risk-relevant changes additionally require browser, accessibility, performance, security, prompt evaluation or migration evidence. Branch protection requires review and successful checks; administrators do not bypass release gates for feature work.

## 2. Static standards

- TypeScript strict mode plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride` and consistent module boundaries.
- ESLint with Next/React hooks/import/dependency-boundary/security rules; no unhandled promises or unsafe `any` without approved localized suppression.
- Prettier is the sole formatter; editor settings and CI enforce LF/UTF-8/final newline.
- Markdown lint/link checking, Mermaid parsing, Redocly OpenAPI lint and Prisma format/validate.
- Conventional commits and Changesets for user-facing packages/releases.

## 3. Test layers

| Layer | Scope | Tool direction | Gate |
|---|---|---|---|
| Unit | domain, pricing, manifest/rule parsers, formatters | Vitest + property/mutation support | every PR |
| Component | accessible UI states/forms | Testing Library + axe | feature PR |
| Integration | Prisma repositories, transactions, providers | Vitest + Testcontainers PostgreSQL/MinIO | every PR touching services/data |
| Contract | OpenAPI routes, provider ports, DTO mapping | Prism/Schemathesis + contract suites | every API/provider PR |
| Browser E2E | public/admin critical paths | Playwright | every PR smoke; full on `develop`/release |
| Visual | responsive layouts/viewer fallback | Playwright screenshots with reviewed baselines | UI PR/release |
| Performance | web vitals, bundle, viewer assets/memory, API load | Lighthouse CI, bundle analyzer, Playwright, k6 | budget PR/release |
| Security | SAST, secret/dependency/container, DAST | GitHub/approved scanners + ZAP baseline | PR/release cadence |
| AI evaluation | grounding, safety, schema and regression | frozen dataset + human calibration | prompt/model/provider change |

## 4. Coverage

- Domain, pricing and contracts: ≥90% lines/branches; pricing decision branches and rule kinds 100%.
- Application and provider adapters: ≥80% lines/branches, with contract tests for every adapter.
- UI: coverage is not a substitute for behavior; every screen state and critical keyboard workflow is tested.
- Changed-code coverage ≥85%. Coverage exclusions require comment and review; generated types/migrations are excluded.
- Mutation testing threshold ≥80% for pricing and configuration validation before MVP release.

## 5. Required critical scenarios

- Anonymous discovery → configuration → reprice → consent → issued quote → ready PDF.
- Same journey with WebGL absent, AI unavailable and delayed PDF independently.
- Invalid dependencies/dimensions, stale configuration and idempotent quote retry.
- Admin draft → asset processing → viewer mapping → pricing simulation → publication.
- All RBAC roles and direct API denial; two-organization isolation on every repository/list/token path.
- Issued quote remains identical after new product/pricing publication.
- Public token expiry/revocation and no sensitive token in logs/referrer.
- English/French, 320 px, keyboard, screen reader smoke and reduced motion.

## 6. Accessibility

- WCAG 2.2 AA is a release requirement, not only automated lint.
- Automated axe checks on every page/state; zero critical/serious violations.
- Manual audits: keyboard/focus, NVDA+Firefox, VoiceOver+Safari, 200% zoom, reflow at 320 CSS px, contrast, touch targets, live regions, reduced motion and PDF tagging.
- Accessibility acceptance is owned by feature authors and reviewed by a trained reviewer before release.

## 7. Performance budgets

| Budget | Target |
|---|---:|
| Public route JS before viewer | ≤170 kB gzip |
| Viewer lazy chunk | ≤350 kB gzip excluding decoders |
| Admin initial JS per route | ≤250 kB gzip |
| Public LCP / INP / CLS p75 | ≤2.5 s / 200 ms / 0.1 |
| Cached read API p95 | ≤300 ms |
| Standard mutation API p95 | ≤800 ms |
| Quote issue p95 excluding PDF | ≤1.5 s |
| AI p95 / hard timeout | ≤8 s / 12 s |
| Compliant primary model transfer | target ≤5 MB, hard gate 10 MB |
| PDF ready p95 | ≤30 s |

Lighthouse CI minimum: performance 0.85 preview and 0.90 release for representative public pages; accessibility/best-practices/SEO ≥0.95. Real-user monitoring is the production authority.

## 8. Test data and flake policy

Factories create synthetic tenant-isolated deterministic data. Tests freeze time and random IDs where output is asserted. No production-derived PII. A failed test may be retried once only to classify; flaky tests block merge, are assigned an owner and fixed or quarantined with an expiry ≤7 days. E2E avoids arbitrary sleeps and waits on user-visible/network state.

## 9. Defect severity

- P0: cross-tenant/credential exposure, corrupt quote/price, total outage — release blocked, incident process.
- P1: core journey unavailable, persistent incorrect recommendation action, inaccessible critical action — release blocked.
- P2: degraded non-critical function/workaround — explicit release decision.
- P3: cosmetic/low-impact — backlog with reproduction.

## 10. Definition of done

Requirement/AC linked; tests written and passing; docs/OpenAPI/schema updated; accessibility/performance/security impacts assessed; telemetry added without PII; migrations/provider failures/rollback verified where relevant; reviewer evidence attached; no new unresolved warning or flaky test.
