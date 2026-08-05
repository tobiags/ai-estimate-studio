# Security and Privacy Requirements

**Status:** Proposed normative baseline  
**Target:** OWASP ASVS Level 2-aligned controls and GDPR-aligned privacy operations.

## 1. Protected assets and trust boundaries

Protected assets include organization isolation, pricing/catalog integrity, issued quote snapshots, customer contact/consent, staff sessions, public/configuration tokens, provider credentials, private assets/PDFs and audit integrity. Browsers, uploaded files, AI context/output, public tokens and provider responses are untrusted.

## 2. Threat summary

| Threat | Required mitigation |
|---|---|
| Cross-tenant IDOR/query | trusted host organization context, repository scope, service authorization, isolation tests |
| Admin session theft/CSRF | secure HttpOnly SameSite cookies, rotation, short idle lifetime, CSRF + Origin checks, MFA-ready auth |
| Public token enumeration/leak | ≥128-bit random token, hash at rest, expiry/revocation, no logs/referrer, rate limit |
| Price/config tampering | server validation/repricing, pinned revisions, immutable snapshot/checksum, idempotency |
| Malicious upload/model | signed constrained upload, signature/MIME/size checks, malware scan, sandboxed processing, controlled CDN headers |
| Prompt injection/data exfiltration | allowlisted context, delimiters, no write tools, schema/reference verification, output rendering as text |
| XSS/HTML injection | React escaping, sanitized approved rich text only, no raw model HTML, strict CSP |
| SSRF | provider/storage allowlists, no arbitrary URL fetching from catalog/user input |
| Dependency/supply-chain | lockfile, automated review, pinned CI actions/images, SBOM, signature/provenance |
| Audit tampering | append-only service permission, restricted DB role, export auditing and retention |

## 3. Authentication and authorization

- Staff uses Auth.js with approved email/OIDC provider; production requires verified email and supports/enforces MFA through the provider for Owner/Admin.
- Sessions rotate after authentication/privilege change, expire after 8 hours idle/24 hours absolute by default and revoke on suspension.
- RBAC matrix is enforced at application-service entry and resource scope. The last active owner cannot be removed.
- Public endpoints expose only published projections. Unknown and cross-tenant resource IDs return the same `404` behavior.
- Database credentials use least privilege; migration, runtime and read-only operational roles are distinct in production.

## 4. Application controls

- Runtime schema validation and payload size limits on every boundary.
- Security headers: HSTS, restrictive CSP with nonces/hashes, `frame-ancestors 'none'`, `nosniff`, restrictive referrer policy, permissions policy, no wildcard CORS.
- State-changing admin requests require CSRF token and same-origin verification. Configuration cookie requests validate exact resource binding.
- Rate limits by route risk, organization, session and privacy-preserving IP key; login/provider endpoints also use provider controls.
- Database operations are parameterized through Prisma; raw SQL is isolated/reviewed and never interpolates input.
- Error messages/correlation IDs are safe; stack traces and provider responses remain server-only.

## 5. Encryption and secrets

TLS 1.2+ in transit, provider/database encryption at rest, encrypted backups and private buckets. Credentials live in secret managers with rotation owner/frequency; no long-lived cloud keys when OIDC/workload identity exists. Signed URLs have minimum scope and ≤15-minute lifetime. Passwords are not stored by the application when using passwordless/OIDC.

## 6. Upload and asset policy

- Allowed MIME/signature allowlist: approved GLB/GLTF packages and web-safe images/PDF where needed; archive nesting and external GLTF URLs are rejected.
- Default limits: model 10 MB compressed, image 10 MB, PDF 20 MB; organization cannot raise without platform review.
- Processing validates GLTF extensions, URI schemes, node/texture/triangle budgets, decompression ratio and malformed parser behavior in a restricted worker.
- Published assets use immutable content-addressed keys/checksums. SVG/user HTML is not accepted for public rendering in MVP.

## 7. Privacy

- Lawful purpose and explicit policy version are captured separately for quote follow-up and marketing.
- Minimize identity to name, email, optional phone and locale; exact delivery address is not collected in MVP, only normalized zone inputs needed for price.
- Data subject export/deletion is authenticated and audited. Deletion anonymizes retained quote records and revokes public tokens.
- Retention follows [DATA_MODEL.md](../data/DATA_MODEL.md); automated jobs enforce expiry and generate evidence.
- Privacy notice identifies processors, purpose, retention, AI transfer and contact. Provider region/retention/training configuration is reviewed.
- Logs, analytics and AI telemetry do not contain contact data or raw free text. Cookie/analytics consent is separate from quote consent where legally required.

## 8. Secure development and operations

Threat model reviewed at each architecture milestone. CI performs secret, dependency, license, SAST and container scans; critical/high exploitable findings block release. Penetration test covers tenant isolation, auth, quote/config tokens, upload and AI before production. Dependencies receive monthly review and critical patches within 72 hours; risk exceptions have owner/expiry.

## 9. Incident response

Runbook phases: detect, contain, preserve evidence, rotate/revoke, eradicate, restore, notify and retrospective. P0 security incident pages the owner immediately. Customer/regulator notification follows applicable deadlines. Audit, deployment and access logs have synchronized time and protected retention.

## 10. Security acceptance criteria

- Automated two-tenant matrix proves no read/write/list/token/storage disclosure.
- CSRF, session rotation/revocation, role changes and last-owner protections pass integration/E2E tests.
- Quote/config tokens have measured entropy, are hashed, expire/revoke and are redacted from telemetry.
- Malformed, oversized and externally referencing models are rejected before publication.
- AI injection/evasion suite cannot create actionable unverified suggestions or leak prompt/context.
- Restore, credential rotation and invalid pricing rollback drills complete before launch.
