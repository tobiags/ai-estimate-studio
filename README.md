# AI Estimate Studio

AI Estimate Studio is a configurable quotation platform for home-improvement businesses. A homeowner configures a product in an interactive 3D viewer, receives a deterministic price and bounded AI guidance, exports a quote PDF, and can request contact from the business.

This repository is an **Engineering Design Repository**. The `main` branch contains approved product and engineering specifications; implementation proceeds on `develop` in the dependency order defined by the approved roadmap.

## Source of truth

1. [Product specification](docs/product/PRODUCT_SPEC.md)
2. [UX specification](docs/ux/UX_SPEC.md)
3. [System architecture](docs/architecture/SYSTEM_ARCHITECTURE.md)
4. [Domain and data model](docs/data/DATA_MODEL.md)
5. [API contract](docs/api/API.md)
6. [Implementation roadmap](docs/roadmap/IMPLEMENTATION_ROADMAP.md)

The original `AI-Estimate-Studio-Master-Kit.zip` is retained for provenance. Its contents are superseded by the documents under `docs/`.

## Product scope

The current public release is the Mobup modular garden-studio configurator. It starts with a visible, orbitable studio composition and supports bases P1-P4, facade modules M1-M10, the C1 canopy, the Claustra accessory and three visual site contexts: Garden, Poolside and Terrace. These contexts dress the same studio product; they are not separate product families and do not change the indicative module price.

The generic category, product, option, pricing, asset and viewer abstractions remain the platform boundary for future products. Category-specific behavior is expressed as data and rules, not hard-coded components.

The Mobup slice is intentionally static-first: GitHub Pages serves the application, all pricing is indicative and computed locally, and the browser generates the bilingual estimate PDF without an account, server call or paid provider.

## Documentation map

See [docs/README.md](docs/README.md) for ownership, status, approval rules, and the complete document index.

## Branch policy

- `main`: approved specifications and release documentation.
- `develop`: integration branch for implementation after roadmap approval.
- `feature/<issue>-<slug>` and `fix/<issue>-<slug>`: short-lived branches targeting `develop`.
- No generated application code, database migration, or deployable artifact belongs on `main` during the design phase.

## Local foundation setup

Prerequisites are Node.js 24.11.1, Corepack and a running Docker Desktop/Engine with Compose v2. From a fresh clone of `develop`:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm bootstrap
copy .env.example .env.local # Windows
# or: cp .env.example .env.local
corepack pnpm dev
```

The bootstrap waits for PostgreSQL on `localhost:55432`, MinIO on ports `9000`/`9001`, and Mailpit on ports `1025`/`8025`; all ports bind to the loopback interface only. It also creates the local object-storage bucket idempotently. All committed fixtures are synthetic. `pnpm infra:down` stops services while preserving named volumes.

Run `corepack pnpm format:check`, `lint`, `typecheck`, `test`, and `build` before opening a pull request. No production secret belongs in local environment files or fixtures.

## Current phase gate

The roadmap was approved on 2026-08-05. Epic 1 engineering-foundation work is in progress on `develop`; product-domain implementation remains gated by completion of its listed dependencies.
