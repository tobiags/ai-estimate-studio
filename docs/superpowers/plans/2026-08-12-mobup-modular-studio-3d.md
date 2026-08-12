# Mobup Modular Garden Studio 3D Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the public Pergola / Pool / Landscape demo with a bilingual, direct, realistic and orbitable 3D configurator for the Mobup modular garden studio, including deterministic pricing and a local PDF estimate.

**Architecture:** The versioned studio catalog is data, while configuration transitions and width invariants are pure domain functions. A pure pricing adapter turns the active configuration into integer-cent lines and applies configurable VAT. The Next.js static page owns local persistence, rendering and PDF generation; Three.js owns only scene lifecycle, CAD-like meshes, PBR materials and the 360-degree controls.

**Tech Stack:** Next.js 16 static export, React 19, TypeScript, Three.js, Vitest, `pdf-lib`, local Poly Haven CC0 PBR assets, GitHub Pages, Montserrat via local `@font-face` or Google Fonts CSS with `display=swap`.

---

## File structure and ownership

| Area | Files | Responsibility |
| --- | --- | --- |
| Normative documentation | `README.md`, `docs/product/PRODUCT_SPEC.md`, `docs/ux/UX_SPEC.md`, `docs/pricing/PRICING_SPEC.md`, `docs/viewer/OBJECT_VIEWER.md`, `docs/deployment/DEPLOYMENT.md`, `docs/assets/IMAGE_SOURCES.md` | Replace the generic public-demo description with the approved Mobup scope and record all assets. |
| Domain | `packages/domain/src/studio/catalog.ts`, `packages/domain/src/studio/configuration.ts`, `packages/domain/src/studio/configuration.test.ts`, `packages/domain/src/index.ts` | Immutable catalog types, width arithmetic in integer millimetres, module placement and accessory attachment rules. |
| Pricing | `packages/pricing-engine/src/studio-estimate.ts`, `packages/pricing-engine/src/studio-estimate.test.ts`, `packages/pricing-engine/src/index.ts` | HT, 20% configurable VAT, TTC and contractual-exclusion lines. |
| Web data/state | `apps/web/app/studio/catalog.ts`, `apps/web/app/studio/i18n.ts`, `apps/web/app/studio/persistence.ts`, `apps/web/app/studio/*.test.ts` | Public catalog values, French/English copy and safe local configuration persistence. |
| 3D scene | `apps/web/app/viewer/studio-model.ts`, `apps/web/app/viewer/studio-model.test.ts`, `apps/web/app/viewer/studio-viewer.tsx` | Parametric studio groups, PBR material application, real 360-degree canvas and optional analysis labels. |
| Public UI | `apps/web/app/viewer/studio-screen.tsx`, `apps/web/app/page.tsx`, `apps/web/app/layout.tsx`, `apps/web/app/globals.css` | Direct screen, drag/drop palette, accessible fallback controls, Montserrat and responsive layout. |
| PDF | `apps/web/app/studio/quote-pdf.ts`, `apps/web/app/studio/quote-pdf.test.ts`, `apps/web/package.json`, `pnpm-lock.yaml` | Browser-only PDF bytes and download action with the mandatory non-contractual notice. |
| Assets / quality | `apps/web/public/assets/studio/**`, `apps/web/app/studio/assets.ts`, `docs/assets/IMAGE_SOURCES.md` | Licensed PBR asset manifest, lazy loading and asset provenance. |
| Browser validation / deploy | `apps/web/playwright.config.ts`, `apps/web/e2e/studio-configurator.spec.ts`, `apps/web/package.json`, `.github/workflows/pages.yml` | Regression coverage and a verified static GitHub Pages artifact. |

`apps/web/app/viewer/viewer-screen.tsx` is already orphaned. Delete it only in Task 7 after `rg -n "ViewerScreen" apps/web` returns no consumer. Replace, rather than incrementally patch, the current `studio-screen.tsx` and `scene-factory.ts`; both encode the retired product families and their prices.

## Task 1: Synchronize the product documentation with the approved refonte

**Dependencies:** Approved design specification at `docs/superpowers/specs/2026-08-12-studio-modular-3d-refonte-design.md`.

**Files:**

- Modify: `README.md`
- Modify: `docs/product/PRODUCT_SPEC.md`
- Modify: `docs/ux/UX_SPEC.md`
- Modify: `docs/pricing/PRICING_SPEC.md`
- Modify: `docs/viewer/OBJECT_VIEWER.md`
- Modify: `docs/deployment/DEPLOYMENT.md`
- Modify: `docs/assets/IMAGE_SOURCES.md`
- Test: `scripts/check-doc-links.mjs` through `pnpm docs:check`

- [ ] **Step 1: Replace the public-scope paragraphs with the Mobup decision.**

  State that the public demo has one category, `modular-garden-studio`; it does not show Pergola, Pool or Landscape. Preserve the generic platform design docs only where they describe reusable future architecture.

- [ ] **Step 2: Add requirement identifiers and acceptance links.**

  Add `MOBUP-FR-001` through `MOBUP-FR-008` for initial 3D view, P1-P4 / M1-M10 / C1 / Claustra catalog, width rejection, live price, FR/EN, PDF, WebGL fallback and static deployment. Point every identifier to acceptance criterion 1-8 of the approved specification.

- [ ] **Step 3: Record the approved visual and pricing decisions.**

  Document Montserrat, the ivory/mineral/graphite/wood/terracotta palette, 3.00 m depth, 2.80 m wall height, non-contractual pricing and the exclusion of delivery, installation, permit and utilities from the default total.

- [ ] **Step 4: Validate documentation.**

  Run: `pnpm docs:check`

  Expected: exits 0 and produces a Pages-valid documentation artifact.

- [ ] **Step 5: Commit and publish documentation.**

  Run:

  ```powershell
  git add README.md docs/product/PRODUCT_SPEC.md docs/ux/UX_SPEC.md docs/pricing/PRICING_SPEC.md docs/viewer/OBJECT_VIEWER.md docs/deployment/DEPLOYMENT.md docs/assets/IMAGE_SOURCES.md
  git commit -m "docs(product): adopt Mobup modular studio scope"
  git push origin develop
  ```

  Completion: GitHub `develop` contains the normative scope change and `pnpm docs:check` is green.

## Task 2: Add the pure modular-studio domain model and constraint reducer

**Dependencies:** Task 1.

**Files:**

- Create: `packages/domain/src/studio/catalog.ts`
- Create: `packages/domain/src/studio/configuration.ts`
- Create: `packages/domain/src/studio/configuration.test.ts`
- Modify: `packages/domain/src/index.ts`
- Test: `packages/domain/src/studio/configuration.test.ts`

- [ ] **Step 1: Write the failing configuration tests.**

  Cover the exact 5,000 mm default façade, an M8 insertion rejected after M1 + M8 uses all 5,000 mm, a valid reorder, accessory attachment without width consumption, and immutable returned arrays.

  ```ts
  expect(remainingWidthMm(defaultStudioConfiguration)).toBe(0);
  expect(canInsertWall(defaultStudioConfiguration, "M7")).toEqual({ ok: false, reason: "WIDTH_EXCEEDED" });
  expect(attachAccessory(defaultStudioConfiguration, "CLAUSTRA", "wall-1").accessories[0]?.targetWallId).toBe("wall-1");
  ```

- [ ] **Step 2: Run the focused test to prove the contract is absent.**

  Run: `pnpm --filter @ai-estimate-studio/domain test -- configuration.test.ts`

  Expected: FAIL because `defaultStudioConfiguration`, `canInsertWall` and `attachAccessory` do not exist.

- [ ] **Step 3: Define the catalog and reducer API using only integer millimetres.**

  Export `StudioModuleCode`, `StudioBaseCode`, `StudioAccessoryCode`, `StudioCatalog`, `StudioConfiguration`, `WallInstance`, `AccessoryInstance`, `defaultStudioConfiguration`, `remainingWidthMm`, `canInsertWall`, `insertWall`, `moveWall`, `removeWall`, `attachAccessory` and `removeAccessory`. Store `P1=1250`, `P2=2500`, `P3=3750`, `P4=5000`; all walls use the approved widths. `insertWall` returns a discriminated result instead of throwing for a normal incompatible user action.

  ```ts
  export type MutationResult =
    | Readonly<{ ok: true; configuration: StudioConfiguration }>
    | Readonly<{ ok: false; reason: "WIDTH_EXCEEDED" | "UNKNOWN_MODULE" | "INVALID_TARGET" }>;
  ```

- [ ] **Step 4: Export and verify the reducer.**

  Run:

  ```powershell
  pnpm --filter @ai-estimate-studio/domain test -- configuration.test.ts
  pnpm --filter @ai-estimate-studio/domain typecheck
  ```

  Expected: all focused tests pass and TypeScript exits 0.

- [ ] **Step 5: Commit and publish the domain boundary.**

  ```powershell
  git add packages/domain/src/studio packages/domain/src/index.ts
  git commit -m "feat(domain): model modular studio configuration"
  git push origin develop
  ```

  Completion: width and attachment logic have no React, Three.js, DOM or currency formatting dependency.

## Task 3: Implement deterministic Mobup estimate calculation

**Dependencies:** Task 2.

**Files:**

- Create: `packages/pricing-engine/src/studio-estimate.ts`
- Create: `packages/pricing-engine/src/studio-estimate.test.ts`
- Modify: `packages/pricing-engine/src/index.ts`
- Test: `packages/pricing-engine/src/studio-estimate.test.ts`

- [ ] **Step 1: Write failing pricing examples in integer cents.**

  Test `P4 + M1 + M8 + Claustra` as 696,000 cents HT, 139,200 cents VAT and 835,200 cents TTC. Test removal of Claustra, a configurable zero-VAT policy, and a negative amount rejected before totals are produced.

  ```ts
  expect(estimate.subtotalMinor).toBe("696000");
  expect(estimate.taxMinor).toBe("139200");
  expect(estimate.totalMinor).toBe("835200");
  ```

- [ ] **Step 2: Run the focused tests.**

  Run: `pnpm --filter @ai-estimate-studio/pricing-engine test -- studio-estimate.test.ts`

  Expected: FAIL because `evaluateStudioEstimate` is not exported.

- [ ] **Step 3: Implement line generation and tax application.**

  `evaluateStudioEstimate(input)` accepts a configuration, catalog prices and `taxRateBps`; it creates one `PriceLine` for the base, each wall and each accessory, marks every taxable line `STANDARD`, calls existing `applyTaxes` with `{ mode: "EXCLUSIVE", rounding: "TOTAL", currency: "EUR" }`, and returns `subtotalMinor`, `taxMinor`, `totalMinor` plus frozen lines. Do not add delivery, labour or discount lines to the default estimate.

- [ ] **Step 4: Run pricing verification.**

  Run:

  ```powershell
  pnpm --filter @ai-estimate-studio/pricing-engine test -- studio-estimate.test.ts
  pnpm --filter @ai-estimate-studio/pricing-engine typecheck
  ```

  Expected: all scenarios pass without floating-point arithmetic.

- [ ] **Step 5: Commit and publish.**

  ```powershell
  git add packages/pricing-engine/src/studio-estimate.ts packages/pricing-engine/src/studio-estimate.test.ts packages/pricing-engine/src/index.ts
  git commit -m "feat(pricing): calculate modular studio estimates"
  git push origin develop
  ```

  Completion: the displayed and PDF totals have one shared, deterministic source.

## Task 4: Build the public catalog, translations and local persistence adapter

**Dependencies:** Tasks 2-3.

**Files:**

- Create: `apps/web/app/studio/catalog.ts`
- Create: `apps/web/app/studio/catalog.test.ts`
- Create: `apps/web/app/studio/i18n.ts`
- Create: `apps/web/app/studio/persistence.ts`
- Create: `apps/web/app/studio/persistence.test.ts`
- Test: `apps/web/app/studio/catalog.test.ts`, `apps/web/app/studio/persistence.test.ts`

- [ ] **Step 1: Write catalog tests before catalog data.**

  Assert that the catalog has bases P1-P4, walls M1-M10, accessories C1 and CLAUSTRA, `P4` has 5,000 mm, `M8` has 3,750 mm, the default configuration exactly fills P4, and every English string has a French translation.

- [ ] **Step 2: Add the single source of truth for public product data.**

  In `catalog.ts`, define the price table from the approved specification and map each module to `solid`, `opening` or `glazed` geometry metadata. M2-M6 and M9 keep neutral public names (`Module M2`, etc.) in both languages until manufacturer nomenclature exists. Export a `catalogVersion` constant so saved browser state can be invalidated safely.

- [ ] **Step 3: Add serialization that cannot trust stale browser data.**

  `loadStudioConfiguration(storage)` must parse JSON in `try/catch`, require the known `catalogVersion`, reconstruct through the Task 2 reducer and fall back to `defaultStudioConfiguration` for malformed, oversized or incompatible input. `saveStudioConfiguration` stores only base code, wall codes/order, accessory target IDs and locale.

- [ ] **Step 4: Verify client data code.**

  Run:

  ```powershell
  pnpm --filter @ai-estimate-studio/web test -- catalog.test.ts persistence.test.ts
  pnpm --filter @ai-estimate-studio/web typecheck
  ```

  Expected: invalid `localStorage` never breaks the initial screen.

- [ ] **Step 5: Commit and publish.**

  ```powershell
  git add apps/web/app/studio
  git commit -m "feat(web): add Mobup catalog and local state"
  git push origin develop
  ```

  Completion: UI code reads catalog and copy; it contains no hard-coded price or dimension.

## Task 5: Prepare licensed PBR assets and the runtime asset manifest

**Dependencies:** Task 4.

**Files:**

- Create: `apps/web/app/studio/assets.ts`
- Create: `apps/web/public/assets/studio/materials/cedar/*`
- Create: `apps/web/public/assets/studio/materials/graphite/*`
- Create: `apps/web/public/assets/studio/models/*`
- Modify: `docs/assets/IMAGE_SOURCES.md`
- Test: `apps/web/app/studio/assets.test.ts`

- [ ] **Step 1: Add the failing manifest validation test.**

  Require a unique key, local URL beginning `/assets/studio/`, declared licence, byte budget and `critical` boolean for every asset. Require default critical assets to fit within a 6 MB total transfer budget.

- [ ] **Step 2: Acquire only local, redistributable assets.**

  Download the required 1K colour, normal and roughness maps from Poly Haven CC0. Keep the existing Lapa HDRI only if its neutral daylight result remains appropriate; otherwise replace it with a listed CC0 neutral daylight HDRI. Add no decorative green grass, lantern, fire pit, pergola furniture or garden-image background to the new default scene.

- [ ] **Step 3: Generate the presentation reference separately from scene geometry.**

  Use the approved image-generation harness to create one clean architectural reference of the Mobup studio with cedar, anthracite glazing, mineral paving and clear daylight. Store it only under `apps/web/public/assets/studio/references/`, label it `conceptual-reference`, and do not load it into the orbitable canvas.

- [ ] **Step 4: Record provenance and validate the manifest.**

  Add the source URL, licence, exact use, checksum and generated-image label to `docs/assets/IMAGE_SOURCES.md`. Run: `pnpm --filter @ai-estimate-studio/web test -- assets.test.ts`.

  Expected: a missing licence, duplicate key or critical bundle above budget fails.

- [ ] **Step 5: Commit and publish binary assets deliberately.**

  ```powershell
  git add apps/web/app/studio/assets.ts apps/web/app/studio/assets.test.ts apps/web/public/assets/studio docs/assets/IMAGE_SOURCES.md
  git commit -m "feat(assets): add Mobup PBR asset manifest"
  git push origin develop
  ```

  Completion: every production visual asset is locally served, attributable and separated from generated visual references.

## Task 6: Replace the retired scene factory with a parametric Mobup model

**Dependencies:** Tasks 2, 4 and 5.

**Files:**

- Create: `apps/web/app/viewer/studio-model.ts`
- Create: `apps/web/app/viewer/studio-model.test.ts`
- Modify: `apps/web/app/viewer/scene-factory.ts`
- Test: `apps/web/app/viewer/studio-model.test.ts`

- [ ] **Step 1: Write geometry-invariant tests.**

  Build `P4 + M1 + M8 + Claustra` and assert model user-data has `widthMm=5000`, `depthMm=3000`, `heightMm=2800`, exactly two wall groups and one claustra group. Build `P2 + M1` and assert all wall meshes stay within the base bounds.

- [ ] **Step 2: Run the tests to establish the missing implementation.**

  Run: `pnpm --filter @ai-estimate-studio/web test -- studio-model.test.ts`

  Expected: FAIL because `createMobupStudioModel` is absent.

- [ ] **Step 3: Implement CAD-like structural groups.**

  `createMobupStudioModel(configuration, materialSet)` creates named groups `foundation`, `roof`, `walls`, `accessories` and `analysis`. It places every wall in order along the façade x-axis, derives its width from the catalog, uses 3.00 m depth and 2.80 m height, and assigns PBR `MeshStandardMaterial` instances. M7 and M8 receive glass panes and graphite frames; M1/M10 receive cedar cladding; C1 and Claustra attach to the selected wall group.

  ```ts
  const xCenterMm = usedWidthMm + module.widthMm / 2 - base.widthMm / 2;
  wallGroup.position.x = xCenterMm / 1000;
  usedWidthMm += module.widthMm;
  ```

- [ ] **Step 4: Replace retired scene paths and verify.**

  Remove product unions for `pergola`, `pool` and `garden` from `scene-factory.ts`. Retain only shared helpers that are used by the new model. Run:

  ```powershell
  pnpm --filter @ai-estimate-studio/web test -- studio-model.test.ts
  pnpm --filter @ai-estimate-studio/web typecheck
  ```

  Expected: no source export references a retired product family.

- [ ] **Step 5: Commit and publish.**

  ```powershell
  git add apps/web/app/viewer/studio-model.ts apps/web/app/viewer/studio-model.test.ts apps/web/app/viewer/scene-factory.ts
  git commit -m "feat(viewer): model Mobup studio parametrically"
  git push origin develop
  ```

  Completion: the model is genuine geometry in every orbit direction and not a visual plate.

## Task 7: Implement the 360-degree viewer lifecycle and analysis overlay

**Dependencies:** Task 6.

**Files:**

- Create: `apps/web/app/viewer/studio-viewer.tsx`
- Create: `apps/web/app/viewer/studio-viewer.test.ts`
- Modify: `apps/web/app/viewer/studio-screen.tsx`
- Delete: `apps/web/app/viewer/viewer-screen.tsx` after import check
- Test: `apps/web/app/viewer/studio-viewer.test.ts`

- [ ] **Step 1: Write failing viewer-controller tests.**

  Test the pure camera constants, analysis-label visibility mapping and `disposeSceneResources` traversal. Assert that a reset restores the exact initial camera target and that disposal calls both `geometry.dispose()` and `material.dispose()`.

- [ ] **Step 2: Run the focused test.**

  Run: `pnpm --filter @ai-estimate-studio/web test -- studio-viewer.test.ts`

  Expected: FAIL because the viewer controller is absent.

- [ ] **Step 3: Create `StudioViewer`.**

  It owns `WebGLRenderer`, `PerspectiveCamera`, `OrbitControls`, an HDR environment, resize observer, RAF cleanup, bounded orbit/zoom and a `resetView()` imperative callback. It takes `configuration`, `showAnalysis`, `onReady` and `onSnapshot` props. Set `enablePan=false`, clamp polar angles to prevent ground inversion, set `renderer.outputColorSpace = THREE.SRGBColorSpace`, enable soft shadows and cap device pixel ratio at 2.

- [ ] **Step 4: Add the graceful fallback and analysis layer.**

  Catch WebGL initialization errors and render an isometric structural SVG/HTML summary with the same configuration controls. When `showAnalysis` is true, render only dimensions, module codes, materials and estimate values from supplied state; do not mutate configuration or hide the actual model.

- [ ] **Step 5: Remove the unused legacy viewer and verify.**

  Run:

  ```powershell
  rg -n "ViewerScreen|pergola|pool|garden" apps/web/app apps/web/src
  pnpm --filter @ai-estimate-studio/web test -- studio-viewer.test.ts
  ```

  Expected: `ViewerScreen` and retired public product labels have no consumer. Then commit:

  ```powershell
  git add apps/web/app/viewer
  git rm apps/web/app/viewer/viewer-screen.tsx
  git commit -m "feat(viewer): add Mobup 360 analysis viewer"
  git push origin develop
  ```

  Completion: orbit, zoom, reset, render cleanup and WebGL fallback are independently testable.

## Task 8: Replace the public page with the direct configurator

**Dependencies:** Tasks 2-4 and 7.

**Files:**

- Modify: `apps/web/app/viewer/studio-screen.tsx`
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/app/layout.tsx`
- Modify: `apps/web/app/globals.css`
- Test: `apps/web/app/viewer/studio-screen.test.tsx`

- [ ] **Step 1: Add focused interaction tests.**

  Test initial `P4 + M1 + M8 + Claustra`, a base choice that is narrower than the existing façade is disabled with an explanation, click insertion rejects M8 when space is insufficient, keyboard `Enter` performs the same insertion as click, and French switches all labels including the non-contractual notice.

- [ ] **Step 2: Run the screen test.**

  Run: `pnpm --filter @ai-estimate-studio/web test -- studio-screen.test.tsx`

  Expected: FAIL until the screen exposes the approved controls.

- [ ] **Step 3: Rebuild the screen around reducer state.**

  Replace the retired selector/cards/options with a single `StudioScreen` using `useReducer` around Task 2 transitions. Render `StudioViewer` first, a compact base selector, horizontally scrollable wall palette, accessory palette, width meter, price breakdown, FR/EN switch and `Analyse` toggle. Persist only after a successful reducer mutation.

- [ ] **Step 4: Implement drag/drop as progressive enhancement.**

  A palette item sets `dataTransfer` to the wall code; a façade-slot drop computes an insertion index; both call the same `insertWall` action. Keep an always-visible `Ajouter` button for touch, keyboard and unsupported drag APIs. Announce rejection in an `aria-live="polite"` region.

- [ ] **Step 5: Apply the approved visual system.**

  Add Montserrat with `font-display: swap`; use CSS variables `--studio-ink`, `--studio-surface`, `--studio-mineral`, `--studio-wood` and `--studio-accent`. Remove the current green canvas, marquee, vivid outline treatment and all retired product cards. On widths below 820 px, place the inspector below the viewer and preserve a minimum 56 dVH scene.

- [ ] **Step 6: Verify and commit.**

  Run:

  ```powershell
  pnpm --filter @ai-estimate-studio/web test -- studio-screen.test.tsx
  pnpm --filter @ai-estimate-studio/web lint
  pnpm --filter @ai-estimate-studio/web typecheck
  ```

  Then:

  ```powershell
  git add apps/web/app/page.tsx apps/web/app/layout.tsx apps/web/app/globals.css apps/web/app/viewer/studio-screen.tsx apps/web/app/viewer/studio-screen.test.tsx
  git commit -m "feat(web): build direct Mobup studio configurator"
  git push origin develop
  ```

  Completion: one public page gives direct visual result, configuration and estimate without a multi-step flow.

## Task 9: Add local estimate-PDF generation and customer-detail sheet

**Dependencies:** Tasks 3, 4, 7 and 8.

**Files:**

- Modify: `apps/web/package.json`
- Modify: `pnpm-lock.yaml`
- Create: `apps/web/app/studio/quote-pdf.ts`
- Create: `apps/web/app/studio/quote-pdf.test.ts`
- Modify: `apps/web/app/viewer/studio-screen.tsx`
- Test: `apps/web/app/studio/quote-pdf.test.ts`

- [ ] **Step 1: Add `pdf-lib` and lock the dependency.**

  Run: `pnpm --filter @ai-estimate-studio/web add pdf-lib`

  Expected: only `apps/web/package.json` and `pnpm-lock.yaml` change for dependency resolution.

- [ ] **Step 2: Write the PDF contract tests.**

  Build an English and a French PDF from the default estimate; assert bytes begin `%PDF`, selected module IDs occur in extracted text, `Estimate only - non-contractual` / `Estimation non contractuelle` occurs in the right language, and customer fields are optional.

- [ ] **Step 3: Implement the browser-only builder.**

  `createStudioEstimatePdf({ configuration, estimate, locale, customer, snapshotPng })` uses `pdf-lib` to draw the header, project metadata, module table, HT/VAT/TTC totals, exclusions, optional contact fields and snapshot. It returns `Uint8Array`; `downloadStudioEstimatePdf` creates an object URL and revokes it after clicking a temporary anchor.

- [ ] **Step 4: Wire explicit customer details and retry state.**

  Add a small optional form above the PDF button: name, e-mail, project label. Validate only basic length and e-mail syntax when non-empty. On PDF failure show an in-page retry message while retaining the configuration; never post the fields anywhere.

- [ ] **Step 5: Verify and commit.**

  Run:

  ```powershell
  pnpm --filter @ai-estimate-studio/web test -- quote-pdf.test.ts
  pnpm --filter @ai-estimate-studio/web build
  ```

  Then:

  ```powershell
  git add apps/web/package.json pnpm-lock.yaml apps/web/app/studio/quote-pdf.ts apps/web/app/studio/quote-pdf.test.ts apps/web/app/viewer/studio-screen.tsx
  git commit -m "feat(web): export local studio estimate PDF"
  git push origin develop
  ```

  Completion: a browser can download a bilingual, non-contractual PDF without a backend call.

## Task 10: Add end-to-end coverage, static artifact checks and asset budget enforcement

**Dependencies:** Tasks 5-9.

**Files:**

- Modify: `apps/web/package.json`
- Modify: `pnpm-lock.yaml`
- Create: `apps/web/playwright.config.ts`
- Create: `apps/web/e2e/studio-configurator.spec.ts`
- Create: `scripts/check-studio-assets.mjs`
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`
- Modify: `.github/workflows/pages.yml`
- Test: `apps/web/e2e/studio-configurator.spec.ts`, `scripts/check-studio-assets.mjs`

- [ ] **Step 1: Add Playwright as a development dependency and a `test:e2e` script.**

  Run: `pnpm --filter @ai-estimate-studio/web add -D @playwright/test`

  Add `test:e2e` to `apps/web/package.json` and root `test:e2e:studio` that calls the filtered command.

- [ ] **Step 2: Implement the browser scenario.**

  The spec loads `/`, waits for `3D view ready`, drags the canvas, changes zoom with the wheel, clicks reset, opens Analysis, adds M2 to a P4 configuration after removing M8, verifies the live width and price, switches to French, triggers the PDF download and checks that no console error occurred.

- [ ] **Step 3: Add a static asset guard.**

  `scripts/check-studio-assets.mjs` reads the manifest, verifies that every path exists under `apps/web/public`, sums `critical` byte sizes, fails above 6 MB and rejects paths containing `pergola`, `pool`, `garden`, `firepit`, `lantern` or `grass` in the Mobup manifest.

- [ ] **Step 4: Make CI and Pages run the same static checks.**

  Add `pnpm check:studio-assets` after tests in CI. In Pages, run it before `pnpm build`, retain `STATIC_EXPORT=true` and verify `apps/web/out/index.html` exists after build with the existing `docs:artifact` check.

- [ ] **Step 5: Verify locally and commit.**

  Run:

  ```powershell
  pnpm check:studio-assets
  STATIC_EXPORT=true NEXT_PUBLIC_BASE_PATH='' pnpm --filter @ai-estimate-studio/web build
  pnpm --filter @ai-estimate-studio/web test:e2e
  ```

  Expected: a static artifact exists and the full user journey passes on Chromium. Then:

  ```powershell
  git add apps/web/package.json pnpm-lock.yaml apps/web/playwright.config.ts apps/web/e2e/studio-configurator.spec.ts scripts/check-studio-assets.mjs package.json .github/workflows/ci.yml .github/workflows/pages.yml
  git commit -m "test(web): cover static Mobup configurator journey"
  git push origin develop
  ```

  Completion: CI detects a broken static export, missing asset, forbidden retired asset or failed core interaction before deployment.

## Task 11: Perform visual, accessibility and production checks

**Dependencies:** Tasks 1-10.

**Files:**

- Modify: `docs/quality/QUALITY_STRATEGY.md`
- Modify: `docs/deployment/DEPLOYMENT.md`
- Modify: `CHANGELOG.md`
- Test: full repository suite and manual browser checklist

- [ ] **Step 1: Run the complete mechanical verification suite.**

  Run:

  ```powershell
  pnpm format:check
  pnpm lint
  pnpm typecheck
  pnpm test
  pnpm check:studio-assets
  STATIC_EXPORT=true NEXT_PUBLIC_BASE_PATH='' pnpm build
  pnpm docs:check
  ```

  Expected: every command exits 0.

- [ ] **Step 2: Perform the browser acceptance walkthrough.**

  Start `pnpm --filter @ai-estimate-studio/web dev`, open `http://localhost:3000`, and verify at desktop and 390 px width: initial scene present, no green decorative UI, Montserrat loaded, orbit/zoom/reset, analysis labels, click and drag module placement, invalid width rejection, FR/EN, PDF download and WebGL fallback by temporarily forcing renderer initialization to throw in a local test build.

- [ ] **Step 3: Record verified budgets and exceptions.**

  Add the final initial-transfer bytes, critical asset bytes, Lighthouse accessibility/performance snapshots and tested browser versions to `docs/quality/QUALITY_STRATEGY.md`. Add the exact GitHub Pages URL, deployment workflow and rollback procedure to `docs/deployment/DEPLOYMENT.md`.

- [ ] **Step 4: Update release record and commit.**

  Add a `Changed` entry to `CHANGELOG.md` naming the replaced demo and local PDF capability. Run `git diff --check`, then:

  ```powershell
  git add docs/quality/QUALITY_STRATEGY.md docs/deployment/DEPLOYMENT.md CHANGELOG.md
  git commit -m "docs(release): verify Mobup studio demo quality"
  git push origin develop
  ```

  Completion: visual proof, accessibility, performance, static deployment and rollback evidence are recorded alongside the shipped code.

## Coverage review

| Approved requirement | Plan task(s) |
| --- | --- |
| Direct public 3D Mobup studio | 6, 7, 8 |
| P1-P4, M1-M10, C1, Claustra | 2, 4, 6 |
| 3.00 m depth, 2.80 m height, width constraints | 2, 6 |
| 360-degree, realistic PBR presentation | 5, 6, 7 |
| Analysis mode | 7, 8 |
| Accessible indicative price and VAT | 3, 4, 8 |
| French / English and Montserrat | 4, 8 |
| Local non-contractual PDF | 9 |
| GitHub Pages without server or secrets | 1, 10, 11 |
| Asset licence, performance and quality evidence | 5, 10, 11 |

## Plan self-review

- **Spec coverage:** every acceptance criterion from the approved design maps to one or more concrete tasks above.
- **Deferred-work scan:** the plan contains no deferred implementation marker; the known manufacturer nomenclature gap is represented as neutral module labels, exactly as approved.
- **Type consistency:** `StudioConfiguration` originates in `@ai-estimate-studio/domain`; `evaluateStudioEstimate` consumes its serializable shape; `StudioViewer` receives the same configuration and never calculates price.
- **Scope control:** no database, API, account, CRM, e-mail, payment or provider-generated 3D endpoint is introduced. Those remain explicitly out of scope.
