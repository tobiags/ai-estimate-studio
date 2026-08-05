# AI Estimate Studio Product Specification

**Status:** Proposed normative specification  
**Target release:** MVP  
**Product model:** Multi-organization B2B platform with an anonymous customer journey and authenticated administration

## 1. Vision and problem

Home-improvement estimates are slow, inconsistent, and difficult for customers to understand. AI Estimate Studio lets a business publish configurable products, rules, assets, and guidance once, then gives customers a visual, transparent and repeatable quotation journey.

The platform is not a binding contract, construction survey, engineering calculator, payment system, CRM, or CAD authoring tool. An estimate remains subject to business review and site validation.

## 2. Goals and non-goals

### Goals

- Let an anonymous visitor configure an eligible product without account creation.
- Keep a visible, itemized, deterministic estimate synchronized with configuration changes.
- Provide optional AI explanations and alternatives that never invent products or prices.
- Generate an immutable, traceable PDF estimate and capture consented contact details.
- Let authorized staff manage catalog, assets, hotspots, pricing, publication, and quotes.
- Support pools, pergolas, garden sheds, and roofing through configuration rather than category-specific code.

### Non-goals for MVP

- Payments, financing decisions, inventory reservation, construction scheduling, CAD editing, AR, collaborative quote editing, CRM synchronization, and automatic contractual acceptance.
- Customer accounts and cross-device saved configurations.
- AI image or 3D model generation.
- Fully offline usage or native mobile applications.

## 3. Personas

### P1 — Homeowner / buyer

- **Goal:** understand feasible choices and an estimated budget before speaking to sales.
- **Context:** often mobile, limited technical vocabulary, may have accessibility needs.
- **Needs:** plain language, price transparency, reversible choices, clear uncertainty, privacy.
- **Failure concern:** surprise costs or a misleading “final” price.

### P2 — Sales representative

- **Goal:** qualify leads and continue from a customer’s quote with its exact snapshot.
- **Needs:** searchable quote list, contact consent, configuration summary, expiry and status.
- **Failure concern:** quote changed after it was sent or insufficient context for follow-up.

### P3 — Catalog/pricing administrator

- **Goal:** publish correct offerings without developer support.
- **Needs:** draft/publish workflow, validation, preview, pricing simulation, asset processing status.
- **Failure concern:** publishing incompatible options or a rule that creates an incorrect total.

### P4 — Company owner

- **Goal:** maintain governance, brand, users, taxation defaults, performance and lead conversion.
- **Needs:** organization settings, role control, audit trail, operational metrics.
- **Failure concern:** cross-tenant disclosure, unauthorized pricing changes, untraceable edits.

### P5 — Installer / estimator

- **Goal:** understand what was selected before a site survey.
- **Needs:** dimensions, selected options, customer notes, exclusions and quote version.
- **Failure concern:** ambiguous configuration or assumptions presented as verified facts.

## 4. Primary user stories

| ID | As a… | I want… | So that… |
|---|---|---|---|
| US-001 | Buyer | browse published categories and products | I can find an appropriate project type |
| US-002 | Buyer | configure a product step by step | I understand valid choices |
| US-003 | Buyer | manipulate a 3D model and inspect hotspots | I understand visible features |
| US-004 | Buyer | see price changes and line items immediately | I remain within budget |
| US-005 | Buyer | receive grounded AI explanations and alternatives | I can make informed trade-offs |
| US-006 | Buyer | provide contact details and consent | the business can follow up |
| US-007 | Buyer | download an accessible PDF estimate | I can retain and share the result |
| US-008 | Sales rep | search and review quotes | I can qualify and follow up accurately |
| US-009 | Admin | manage catalog entities in draft | changes can be reviewed safely |
| US-010 | Admin | author hotspots against a model preview | annotations remain product-independent |
| US-011 | Admin | simulate and publish pricing rules | customers receive deterministic totals |
| US-012 | Owner | manage staff roles and audit events | privileged changes are accountable |

## 5. Functional requirements

### Catalog and discovery

- **FR-001:** The public catalog must expose only organizations, categories, products, variants, options and assets in `PUBLISHED` state and within their publication window.
- **FR-002:** A product must declare one or more variants, a default variant, supported dimensions, option groups, viewer assets, locale, currency and tax context.
- **FR-003:** Search-engine-visible landing and product pages must render meaningful content without WebGL or JavaScript.

### Configuration and viewer

- **FR-010:** Starting a configuration must create a server identifier and pin a catalog revision.
- **FR-011:** Each selection must be validated against availability, cardinality, dependencies, exclusions and numeric bounds.
- **FR-012:** The generic Object Viewer must load a published GLB/GLTF asset, frame it, support orbit/zoom/reset, render configured visibility/material changes, and expose accessible hotspot equivalents.
- **FR-013:** Viewer failure must not block configuration or pricing; a static fallback and textual option controls remain available.
- **FR-014:** Configuration state must be recoverable during the current browser session from a signed server record.

### Pricing

- **FR-020:** Price calculation must be deterministic, side-effect free, versioned, and performed server-side for authoritative totals.
- **FR-021:** The quote breakdown must include base price, option adjustments, labor, delivery, discounts, taxes, subtotal and total.
- **FR-022:** The client may calculate a provisional preview with the same versioned rule set; the server result always wins.
- **FR-023:** Every quote must store the full input, rule revision, line items, currency, tax treatment and totals as an immutable snapshot.

### AI guidance

- **FR-030:** AI guidance must be optional and generated from the current configuration, approved catalog content, price breakdown and user budget.
- **FR-031:** AI output must conform to a structured schema containing summary, rationale, alternatives, warnings and cited entity IDs.
- **FR-032:** AI must not change configuration, compute authoritative prices, claim technical suitability, or expose data from another organization.
- **FR-033:** When AI is unavailable, the customer journey and deterministic quote generation must remain usable.

### Quote, PDF and lead

- **FR-040:** A buyer must confirm name, email, optional phone, locale and explicit contact/privacy consent before final quote generation.
- **FR-041:** Quote creation must revalidate and reprice the pinned configuration atomically.
- **FR-042:** The generated PDF must contain organization identity, unique quote number, issue/expiry dates, selected configuration, itemized price, assumptions, exclusions, AI summary labeled as guidance, and contact information.
- **FR-043:** Quote access by an anonymous buyer must use a high-entropy, expiring public token; enumeration by numeric IDs is prohibited.
- **FR-044:** Quote statuses are `DRAFT`, `ISSUED`, `VIEWED`, `CONTACTED`, `ACCEPTED`, `REJECTED`, `EXPIRED`, and `VOID`; only authorized staff may set business statuses.

### Administration

- **FR-050:** Staff authentication and organization-scoped RBAC must protect all admin functions.
- **FR-051:** Roles are `OWNER`, `ADMIN`, `CATALOG_EDITOR`, `SALES`, and `VIEWER`; least privilege applies.
- **FR-052:** Catalog and pricing changes use draft validation and explicit publication; published revisions are immutable.
- **FR-053:** Asset upload must use signed direct upload, malware/type validation, processing status, checksums and metadata.
- **FR-054:** All privileged mutations must create an audit event containing actor, organization, action, resource, timestamp and safe before/after summary.
- **FR-055:** Admins must preview a product and run pricing scenarios before publication.

### Localization and organization

- **FR-060:** Each organization configures brand, default locale, timezone, currency, quote validity, tax display mode and legal text.
- **FR-061:** MVP UI ships in English and French; catalog content may provide locale-specific values with organization default fallback.
- **FR-062:** Currency conversion is out of scope; a quote uses exactly one configured currency.

## 6. Non-functional requirements

- **NFR-001 Performance:** Public LCP ≤ 2.5 s p75 on mobile; INP ≤ 200 ms p75; CLS ≤ 0.1 p75. Viewer shell becomes interactive ≤ 3 s p75 on a 10 Mbps connection for a compliant asset.
- **NFR-002 API:** Cached reads ≤ 300 ms p95 and mutations ≤ 800 ms p95 excluding AI, PDF rendering, upload and third-party latency.
- **NFR-003 Availability:** Monthly production availability target is 99.9%; planned maintenance is disclosed and excluded.
- **NFR-004 Scale:** MVP supports 100 organizations, 10,000 published products, 250 concurrent configurators, and 100,000 quotes/year without architectural change.
- **NFR-005 Reliability:** RPO ≤ 24 hours and RTO ≤ 4 hours; quote creation is idempotent.
- **NFR-006 Accessibility:** WCAG 2.2 AA for all core workflows; the 3D canvas has equivalent keyboard and textual interaction.
- **NFR-007 Security:** OWASP ASVS Level 2-aligned controls, tenant isolation, encryption in transit/at rest, RBAC, secure upload and auditable privileged changes.
- **NFR-008 Privacy:** GDPR-aligned minimization, consent evidence, retention rules, data export and deletion workflows.
- **NFR-009 Compatibility:** Latest two stable releases of Chrome, Edge, Firefox and Safari; responsive from 320 px; graceful non-WebGL fallback.
- **NFR-010 Maintainability:** Strict TypeScript, documented package boundaries, ≥80% line coverage for domain packages and 100% decision coverage for pricing rules.
- **NFR-011 Observability:** Correlated structured logs, error reporting, web vitals, request latency, AI usage, job status and audit events without secrets or prompt PII.
- **NFR-012 Cost:** AI requests are explicitly triggered, token-limited and cached by safe input hash; assets use CDN caching and lifecycle rules.

## 7. Acceptance criteria

- **AC-001:** Given a published product, an anonymous buyer can reach an issued PDF quote from the landing page on desktop and a 360×800 viewport without an account.
- **AC-002:** Given JavaScript, WebGL or model loading failure, the buyer can still select options, see an authoritative price and issue a quote.
- **AC-003:** Given the same catalog revision, configuration, pricing context and evaluation timestamp, repeated pricing produces byte-equivalent ordered line items and totals.
- **AC-004:** Given incompatible options or invalid dimensions, the API returns field-level RFC 7807 errors and no quote is issued.
- **AC-005:** Given a budget below the current total, AI suggestions cite existing compatible option or variant IDs and the server independently verifies any displayed saving.
- **AC-006:** Given an AI timeout or provider outage, quote creation remains available and the UI communicates that guidance is temporarily unavailable.
- **AC-007:** Given an issued quote, later catalog or pricing publication does not alter its PDF, totals or configuration snapshot.
- **AC-008:** Given users in different organizations, no public token, API query, admin list or asset URL exposes the other organization’s private resources.
- **AC-009:** Given a catalog editor without admin rights, user management, organization settings and audit exports return `403`.
- **AC-010:** Given a pricing rule draft, publication is rejected until all referenced entities exist, dependency cycles are absent, simulations pass and effective dates do not conflict.
- **AC-011:** Given keyboard-only navigation and a screen reader, all core controls, errors, price changes, hotspots and PDF actions are perceivable and operable.
- **AC-012:** Given a compliant GLB asset, switching products releases replaced GPU resources and repeated switches do not show unbounded memory growth in the prescribed test.

## 8. Success metrics

| Metric | Definition | MVP target | Guardrail |
|---|---|---:|---:|
| Configurator start rate | configuration starts / product-page sessions | ≥25% | — |
| Quote completion | issued quotes / configuration starts | ≥20% | form error rate <5% |
| Qualified lead rate | consented contact requests / issued quotes | ≥30% | consent revocation honored |
| Median completion time | start to issued quote | ≤8 min | abandonment tracked by step |
| Pricing integrity | issued quotes without pricing defect | 100% | zero unresolved P1 pricing incidents |
| AI grounding | recommendations whose cited IDs validate | ≥99% | invalid suggestions never actionable |
| Viewer fallback rate | sessions requiring fallback | <5% | quote completion remains possible |
| Accessibility | automated critical/serious violations | 0 | manual WCAG audit before release |
| Reliability | successful quote issue requests | ≥99.5% | duplicate issue rate = 0 |

## 9. Business rules and assumptions made explicit

- Estimates expire after the organization-configured period, default 30 days.
- Products and pricing are organization-scoped. Shared global templates are future scope.
- Buyers do not authenticate in MVP; public quote tokens expire at quote expiry and can be revoked.
- A valid estimate is informational until reviewed according to the organization’s legal text.
- Site-specific feasibility, permits and measurements are explicit assumptions/exclusions, never inferred by AI.
- Tax configuration is owned by the organization and must be reviewed by its finance/legal owner; the platform supplies deterministic mechanics, not tax advice.

## 10. Release gate

MVP release requires AC-001 through AC-012 evidence, no open P0/P1 defect, approved security and accessibility reviews, successful restore rehearsal, production smoke test, and rollback verification.
