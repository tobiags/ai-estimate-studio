# HTTP API Specification

**Status:** Proposed normative contract  
**Canonical machine contract:** [openapi.yaml](openapi.yaml)

## 1. Conventions

- Base path `/api/v1`; health endpoint `/api/health` is unversioned.
- JSON property names use `camelCase`; timestamps use RFC 3339 UTC; IDs are UUIDs; amounts are decimal strings representing integer minor units because JavaScript JSON numbers cannot safely represent `BigInt`.
- Success returns the resource or `{data, page}` for collections. Errors use RFC 7807 `application/problem+json` with stable `type`, `title`, `status`, `detail`, `instance`, `correlationId`, optional `errors[]`.
- Collection pagination uses opaque `cursor` and `limit` (default 20, maximum 100). Sort/filter fields are endpoint allowlists.
- Public cacheable GETs emit `ETag` and `Cache-Control`; admin/configuration/private responses use `no-store`.
- Unsafe requests require `Content-Type: application/json`, same-origin checks and CSRF header for cookie-authenticated admin sessions.
- `Idempotency-Key` is required for quote issue and upload completion. Keys are 16–128 printable characters and scoped to organization + operation for 24 hours.
- Admin PATCH requests include `version`; stale writes return `409`.

## 2. Authentication

- Public catalog: anonymous, organization resolved from trusted host.
- Active configuration: signed, `HttpOnly`, `Secure`, `SameSite=Lax` configuration-session cookie scoped to the configuration. The raw session token is stored only as a hash server-side in the eventual implementation; no cross-device access in MVP.
- Public quote: high-entropy token in the URL; token is redacted from logs/referrers, hashed at rest and expires/revokes with the quote.
- Admin: Auth.js secure session cookie; role and organization membership checked in application services. Unsafe methods require `X-CSRF-Token`.
- Rate limits return `429` plus `Retry-After` and standard rate-limit headers.

## 3. Endpoint catalog

### System and public catalog

| Method | Path | Request | Success |
|---|---|---|---|
| GET | `/api/health` | none | `200 Health` (no dependencies/secrets detail) |
| GET | `/api/v1/categories` | `locale`, cursor, limit | `200 CategoryPage` |
| GET | `/api/v1/categories/{slug}` | `locale` | `200 CategoryDetail` |
| GET | `/api/v1/products` | `category`, `locale`, cursor, limit | `200 ProductSummaryPage` |
| GET | `/api/v1/products/{slug}` | `locale` | `200 ProductDetail` with current published revision/configuration schema |

### Configuration, guidance and quote

| Method | Path | Request | Success |
|---|---|---|---|
| POST | `/api/v1/configurations` | `CreateConfigurationRequest` | `201 Configuration`; sets session cookie |
| GET | `/api/v1/configurations/{id}` | session cookie | `200 Configuration` |
| PATCH | `/api/v1/configurations/{id}` | `UpdateConfigurationRequest` with version | `200 Configuration` including authoritative `PricePreview` |
| POST | `/api/v1/configurations/{id}/recommendations` | `RecommendationRequest` | `201 Recommendation`; `503` does not block quote |
| POST | `/api/v1/quotes` | `IssueQuoteRequest`, `Idempotency-Key` | `202 QuotePublicView`, PDF may be pending |
| GET | `/api/v1/public/quotes/{token}` | none | `200 QuotePublicView`; `410` expired/revoked |
| GET | `/api/v1/public/quotes/{token}/pdf` | none | `302` short-lived signed object URL, `202` while pending |

### Admin organization and members

| Method | Path | Required role | Request/success |
|---|---|---|---|
| GET/PATCH | `/api/v1/admin/organization` | Viewer / Owner for PATCH | `OrganizationSettings`; PATCH includes version |
| GET/POST | `/api/v1/admin/memberships` | Admin | page / `InviteMembershipRequest` → `201 Membership` |
| PATCH/DELETE | `/api/v1/admin/memberships/{id}` | Admin | role/status + version / suspend; last-owner checks |

### Admin catalog aggregates

| Method | Path | Request/success |
|---|---|---|
| GET/POST | `/api/v1/admin/categories` | filters/page / `CategoryWrite` → `201 CategoryAdmin` |
| GET/PATCH/DELETE | `/api/v1/admin/categories/{id}` | resource / versioned write / archive `204` |
| GET/POST | `/api/v1/admin/products` | filters/page / `CreateProductRequest` → product + first draft |
| GET/PATCH | `/api/v1/admin/products/{id}` | stable identity / slug/category/state + version |
| GET/POST | `/api/v1/admin/products/{id}/revisions` | revision page / clone source or empty draft → `201 ProductRevisionDraft` |
| GET/PATCH | `/api/v1/admin/product-revisions/{id}` | complete aggregate / `ProductRevisionWrite` + version → normalized aggregate |
| PUT/DELETE | `/api/v1/admin/product-revisions/{id}/publication` | effective window + version / retire; returns immutable revision |

`ProductRevisionWrite` is the transaction boundary for localized content, variants, dimensions, groups, options, dependencies, asset usages, viewer manifest and hotspots. Child IDs are stable UUIDs; omitted existing draft children are deleted only when `replaceChildren: true`. Published aggregates reject PATCH.

### Admin assets and pricing

| Method | Path | Request/success |
|---|---|---|
| GET | `/api/v1/admin/assets` | kind/status/usage filters → `AssetPage` |
| POST | `/api/v1/admin/assets/uploads` | file metadata → `201 UploadIntent` with signed URL and constraints |
| POST | `/api/v1/admin/assets/{id}/upload-completion` | checksum/bytes + idempotency → `202 Asset` processing |
| GET/DELETE | `/api/v1/admin/assets/{id}` | metadata / archive `204` if permitted |
| GET/PATCH | `/api/v1/admin/pricing-rule-sets/{id}` | full draft / `PricingRuleSetWrite` + version |
| POST | `/api/v1/admin/pricing-rule-sets/{id}/simulations` | explicit `PricingScenario` → `200 PricingSimulation` |
| PUT/DELETE | `/api/v1/admin/pricing-rule-sets/{id}/publication` | effective interval + version / retire → immutable rule set |

### Admin quotes, customers, audit and jobs

| Method | Path | Request/success |
|---|---|---|
| GET | `/api/v1/admin/quotes` | number/status/customer/product/date filters → page |
| GET/PATCH | `/api/v1/admin/quotes/{id}` | immutable detail / status transition + version |
| GET | `/api/v1/admin/customers` | name/email filters → page |
| GET/PATCH | `/api/v1/admin/customers/{id}` | detail/history / identity correction + version |
| POST | `/api/v1/admin/customers/{id}/privacy-requests` | `EXPORT` or `DELETE` → `202 AsyncJob` |
| GET | `/api/v1/admin/audit-events` | actor/action/resource/date filters → page |
| GET | `/api/v1/admin/jobs` | type/status filters → page |
| POST | `/api/v1/admin/jobs/{id}/retries` | version → `202 AsyncJob` if idempotent/retryable |

CSV exports use content negotiation on list endpoints (`Accept: text/csv`) and are limited to Admin/Owner; large exports return a job rather than a synchronous body.

## 4. Principal request/response schemas

### Configuration

```json
{
  "id": "uuid",
  "productRevisionId": "uuid",
  "pricingRuleSetId": "uuid",
  "variantId": "uuid",
  "optionIds": ["uuid"],
  "dimensions": [{ "definitionId": "uuid", "value": "6.500000", "unit": "m" }],
  "delivery": { "countryCode": "FR", "postalCode": "75001", "zoneCode": "FR-IDF" },
  "budgetMinor": "2500000",
  "locale": "fr",
  "version": 3,
  "status": "ACTIVE",
  "price": { "currency": "EUR", "subtotalMinor": "2000000", "discountMinor": "0", "taxMinor": "400000", "totalMinor": "2400000", "lines": [], "warnings": [] },
  "expiresAt": "2026-08-06T12:00:00Z"
}
```

Create requires `productSlug`, optional variant/options/dimensions/budget/locale. Update accepts variant, complete option ID set, complete dimensions, delivery, budget and required `version`; partial child-set semantics are intentionally avoided.

### Quote issue

```json
{
  "configurationId": "uuid",
  "configurationVersion": 3,
  "customer": { "name": "Ada Example", "email": "ada@example.test", "phone": "+33100000000", "locale": "fr" },
  "consents": [
    { "purpose": "QUOTE_FOLLOW_UP", "granted": true, "policyVersion": "privacy-2026-08" },
    { "purpose": "MARKETING", "granted": false, "policyVersion": "privacy-2026-08" }
  ]
}
```

Response contains quote number/status, issue/expiry, immutable selection summary, lines/totals, assumptions/exclusions, verified AI summary when requested, `pdfStatus`, and tokenized `publicUrl`. It never returns token hashes, internal traces or customer history.

### Admin product revision aggregate

Contains `id`, product/revision/state/version, localized content, publication window, `variants[]`, `dimensionDefinitions[]`, `optionGroups[]` with nested options, `dependencies[]`, `assetUsages[]` with viewer manifest/hotspots, linked pricing rule-set summary, validation results and checksums. Every nested reference must belong to the same organization/revision.

### Recommendation

The API returns the exact verified structured output defined in [AI_SYSTEM.md](../ai/AI_SYSTEM.md) plus `id`, `status`, `promptVersion`, `createdAt`. Provider, tokens and cost are admin/telemetry-only.

## 5. Error catalog

| Type suffix | Status | Meaning |
|---|---:|---|
| `validation-error` | 422 | field/domain violations; includes `errors[]` |
| `authentication-required` | 401 | missing/invalid session |
| `forbidden` | 403 | authenticated but not authorized |
| `not-found` | 404 | resource absent or concealed across tenant boundary |
| `conflict` | 409 | stale version, dependency conflict or publication state conflict |
| `expired` | 410 | public token/configuration expired or revoked |
| `unsupported-media-type` | 415 | invalid content type |
| `payload-too-large` | 413 | body/upload exceeds endpoint policy |
| `rate-limit` | 429 | quota exceeded |
| `provider-unavailable` | 503 | optional AI/storage/email dependency unavailable |
| `job-pending` | 202 | artifact accepted but not ready; success representation, not a problem |

Validation error item fields: `path` JSON Pointer, stable `code`, localized/actionable `message`, optional `meta` containing safe bounds/current version.

## 6. Compatibility and deprecation

Breaking changes create `/api/v2`. Additive optional fields may ship in v1. Clients ignore unknown response fields. Deprecated endpoints/fields include `Deprecation: true`, `Sunset` and documentation link for at least 90 days. OpenAPI diff checks block accidental breaking changes.

## 7. Contract verification

- Redocly lint has zero errors; example payloads validate.
- Prism mock serves every endpoint before implementation.
- Schemathesis/property tests cover validation and status codes.
- Application route tests assert auth, tenant isolation, CSRF, idempotency, version conflicts and RFC 7807 content types.
- External contract types are generated/validated from OpenAPI; Prisma models are never serialized directly.
