# Administration Interface Specification

**Status:** Proposed normative specification

## 1. Roles and permissions

| Capability | Owner | Admin | Catalog editor | Sales | Viewer |
|---|:---:|:---:|:---:|:---:|:---:|
| Organization/legal/tax settings | ✓ | — | — | — | — |
| User and role management | ✓ | ✓ except owner removal | — | — | — |
| Catalog/assets/hotspots draft | ✓ | ✓ | ✓ | view | view |
| Pricing draft/simulation | ✓ | ✓ | ✓ | view | view |
| Publish catalog/pricing | ✓ | ✓ | — | — | — |
| View quotes/customers | ✓ | ✓ | view | ✓ | view |
| Update quote status/contact | ✓ | ✓ | — | ✓ | — |
| Audit log/export | ✓ | ✓ | — | — | — |

Authorization is enforced server-side per resource and organization. UI hiding is convenience only.

## 2. Dashboard

Displays issued quotes, quote completion, pending contacts, PDF/asset job failures, drafts awaiting publication and recent privileged activity. Metrics use explicit time range and organization timezone. No fabricated business intelligence is inferred by AI.

## 3. Catalog management

### Categories

Create/edit localized name, description, slug, order and lifecycle. A category cannot publish without default-locale content. Archiving is blocked while it contains published products unless those products are retired in the same reviewed operation.

### Products and revisions

Product list filters by category/state and exposes current published and draft revision. Editing a published product creates a new draft revision cloned from it. Editor sections:

1. Localized identity, content, assumptions and exclusions.
2. Variants and default variant.
3. Dimension definitions.
4. Option groups/options and dependency graph.
5. Assets, viewer mappings and hotspots.
6. Pricing rule set and simulations.
7. SEO/publication preview.
8. Validation and publication.

Publication requires all default-locale content, default variant, valid configuration, ready poster, priceable default scenario, valid dependencies/rules and no viewer manifest errors. A model is recommended but not required because fallback is supported.

## 4. Asset and viewer administration

- Upload initiation checks role, file name/type/size and creates a signed direct-upload request.
- Completion verifies storage metadata/checksum before moving to processing.
- Processing validates MIME/signature, malware policy, dimensions, model extensions, triangle/texture budgets, node list and poster generation.
- The asset screen exposes status, safe error, checksum, size, usage and archive eligibility.
- Viewer editor maps semantic keys to model nodes, configures camera/environment/capabilities, authors hotspots in model-local coordinates, and previews current draft options.
- Numeric coordinate/node selection and ordered textual hotspot editing remain available without pointer precision.

## 5. Pricing administration

- Rule-set revisions are isolated drafts.
- Rule editor uses typed forms for conditions/actions; raw JSON is read-only advanced inspection in MVP.
- Dependency graph and stack groups are visualized with equivalent tables.
- Simulation builder can choose variant, options, dimensions, delivery/tax facts, evaluation timestamp and promotion code.
- Result displays ordered lines, totals and full admin trace with applied/skipped reasons.
- A mandatory scenario suite includes default, min/max dimensions, each rule activation and business-authored regression scenarios.
- Publication is unavailable until static checks and scenarios pass; confirmation identifies effective interval and immutable revision.

## 6. Quote and customer operations

- Quote list filters by number, status, issue/expiry range, customer email/name and product; cursor pagination and CSV export respect filters/role.
- Quote detail reads immutable configuration/catalog/pricing snapshots, line items, AI guidance, consent evidence, PDF/job status and audit history.
- Sales may update status through allowed transitions and add a contact event note. Notes are internal, organization-scoped, timestamped and excluded from AI/PDF.
- Customer detail lists quotes and consent status. Identity correction is audited; anonymization/export is a privileged workflow.
- Reissuing a changed quote is not editing: staff creates a new configuration/quote linked to the prior quote in a future extension. MVP displays “start new estimate”.

## 7. Organization and user settings

- Brand: name, logo, colors with contrast validation and contact details.
- Localization: default/supported locales, timezone, currency (locked after first published pricing without migration), unit display.
- Quote: validity, numbering prefix, assumptions, exclusions and PDF footer.
- Tax: inclusive/exclusive display and reviewed jurisdiction/rates through pricing revisions.
- Legal/privacy: policy version, contact/marketing consent text, retention configuration.
- Users: invite, resend, change role, suspend; cannot remove/suspend the last active owner or self-demote if last owner.

## 8. Audit and operational views

Audit filters actor, action, resource, correlation ID and date; it displays safe structured differences and cannot be edited. CSV export requires Admin/Owner and records its own event. Job view exposes pending/running/failed/dead status, attempts and safe code. Retry requires capability and an idempotent job type.

## 9. Validation and concurrency

- Client validation is advisory; server returns RFC 7807 field/resource violations.
- Every editable record includes `version`. Stale update returns `409` with current version and changed-field summary; automatic overwrite is prohibited.
- Slugs/codes normalize before uniqueness checks. Referential fields use organization-scoped searchable selectors.
- Archive/delete dialogs state affected published resources and immutable references.

## 10. Admin acceptance criteria

- Each role can access exactly the matrix capabilities through direct API calls as well as UI.
- A catalog editor can create a complete draft and simulate price but cannot publish.
- An admin can publish a valid revision, and the public catalog switches atomically after commit/cache invalidation.
- Invalid dependencies, model mappings, scenario failures or effective overlaps block publication with navigable errors.
- Two simultaneous edits cannot silently overwrite each other.
- All privileged changes, exports, publication and retries create audit events.
- Complete catalog, pricing and quote workflows meet WCAG 2.2 AA with keyboard and screen reader.
