# ADR 0007: ClayGL as the premium browser renderer

- **Status:** Accepted for the Mobup slice
- **Date:** 2026-08-14
- **Scope:** `apps/web` interactive studio viewer

## Context

The public configurator must show a credible, orbitable 3D studio without a
server-side render farm. The existing viewer already uses Three.js and local
PBR assets. ClayGL provides a small, modular WebGL runtime with a standard
metallic/roughness material, scene graph, shadows, tone mapping and an orbit
control plugin. Those capabilities are useful for a static-first GitHub Pages
demo where the browser owns the render loop.

## Decision

ClayGL is the public runtime renderer behind the existing `StudioViewer`
boundary. Its scene uses the same domain dimensions and wall/accessory rules
as the validated Three.js composition. Three.js remains an explicit fallback
until the browser compatibility matrix is complete:

1. `clay-studio-model.ts` maps the domain configuration and selected site
   context into ClayGL nodes and standardMR materials.
2. `clay-studio-viewer.tsx` owns the ClayGL application, camera, lighting,
   tone mapping, shadows, resize handling and OrbitControl.
3. `studio-viewer.tsx` selects ClayGL by default. The
   `NEXT_PUBLIC_STUDIO_RENDERER=three` build flag or a `renderer="three"` prop
   enables the fallback for comparison and compatibility; a ClayGL
   initialisation failure also falls back to Three.js.

The domain model, pricing calculation, PDF export and UI state remain
renderer-agnostic. No ClayGL-specific types cross the application/domain
boundary.

## Consequences

### Positive

- PBR metallic/roughness materials and local texture maps are available in the
  same static deployment as the quote UI.
- Shadows, tone mapping and the scene graph improve depth perception while
  keeping the browser-only deployment model.
- The fallback makes the renderer change reversible for older WebGL browsers.
- The abstraction leaves room for a future glTF/GLB asset adapter without
  changing pricing or configuration contracts.

### Trade-offs

- ClayGL is an additional client dependency and increases the viewer bundle.
- The current Mobup model is intentionally rebuilt from domain data; it does
  not copy the anatomy-specific model terminology or introduce a second
  product schema.
- Visual parity between ClayGL and Three.js must be checked when materials or
  lighting are changed.

## Validation

- `pnpm --filter @ai-estimate-studio/web typecheck`
- `pnpm --filter @ai-estimate-studio/web build`
- Browser smoke check: the default canvas has
  `aria-label="Mobup 3D studio viewer rendered with ClayGL"`; the fallback
  uses the corresponding Three.js label. In both modes the ready status is
  visible, orbit drag changes the view, wheel input zooms, and
  Garden/Poolside/Terrace rebuild the context without console errors.
