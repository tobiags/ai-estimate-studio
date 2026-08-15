# ADR 0008: Procedural terrain contexts with local PBR dressing

- **Status:** Accepted for the Mobup slice
- **Date:** 2026-08-15
- **Scope:** `apps/web` interactive studio viewer

## Context

The configurator needs credible garden, poolside and terrace surroundings,
while the studio structure must remain the authoritative CAD-like model. The
open-source [ProceduralTerrains](https://github.com/ZyFou/ProceduralTerrains)
repository demonstrates useful concepts—seeded height fields, grid-based
terrain, water masks, LOD and exportable context assets—but its Three.js
runtime is not the product renderer and would add unnecessary bundle and GPU
cost to a GitHub Pages demo.

## Decision

Use a small deterministic height field owned by the viewer and load a bounded
set of local CC0 Poly Haven glTF assets for close-range detail:

1. `studio-terrain.ts` owns the seeded height function and the three context
   profiles. It is shared by ClayGL and the explicit Three.js fallback.
2. `studio-environment-assets.ts` owns the environment asset plan and loads
   only committed local files. It never calls a remote provider at runtime.
3. ClayGL remains the default renderer and keeps ownership of studio geometry,
   camera, lighting and orbit controls. The Three.js path receives the same
   terrain and asset plan for compatibility.
4. Environment assets are visual context only; they never affect module
   validation, pricing, customer data or PDF totals.
5. The full ProceduralTerrains application is not copied or mounted at runtime.
   Its optional account/API layer, infinite-world mode and cloud rendering are
   explicitly out of scope.

## Asset and performance boundaries

- Each context uses two local PBR assets plus a low-resolution terrain surface.
- The viewer must remain usable without any environment asset: a procedural
  terrain fallback is always created first.
- Asset paths are same-origin and compatible with GitHub Pages base paths.
- Third-party assets must keep their source and license records in the asset
  inventory; the current Poly Haven assets are CC0.
- No context selection changes the estimate. The UI continues to state that
  the environment is visual only.

## Consequences

### Positive

- Exterior silhouettes are materially more credible than primitive-only props.
- The implementation stays static-first and works without a backend or paid
  generation provider.
- ClayGL and Three.js share the same deterministic context contract.
- Replacing or adding an asset is a bounded manifest change rather than a
  renderer rewrite.

### Trade-offs

- The terrain is intentionally lightweight and is not a full infinite-world
  editor.
- ClayGL and Three.js may differ slightly in glTF material fidelity.
- More photorealistic scenes require additional licensed assets and a measured
  transfer/GPU budget.

## Validation

- `pnpm --filter @ai-estimate-studio/web test`
- `pnpm --filter @ai-estimate-studio/web typecheck`
- `pnpm --filter @ai-estimate-studio/web build`
- Browser smoke check for ClayGL and Three.js: garden, poolside and terrace
  load local assets; orbit drag and wheel zoom remain functional; no new
  console errors are emitted.
