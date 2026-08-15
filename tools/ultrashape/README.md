# UltraShape asset refinement

UltraShape is an offline refinement stage for decorative GLB assets. It is not
loaded by the browser and it is not the source of truth for the dimensioned
studio CAD model.

## Pipeline

```text
reference image + coarse GLB
        ↓
Hunyuan3D-2.1 (coarse reconstruction)
        ↓
UltraShape-1.0 (geometric refinement)
        ↓
GLB optimisation and licence review
        ↓
apps/web/public/assets/models/refined/ultrashape/*.glb
        ↓
ClayGL / Three.js static viewer
```

The current manifest in
`apps/web/app/studio/ultrashape-assets.manifest.json` is intentionally marked
`pending`. Until a refined output has passed the acceptance checks, the viewer
uses the local CC0 Poly Haven fallback declared for the same asset.

## Publishing a refined asset

1. Run Hunyuan3D-2.1 and UltraShape in a separate GPU environment. Keep the
   source image and the coarse mesh recorded in the manifest entry.
2. Export a GLB with embedded or same-origin PBR textures. Keep the asset
   decorative and visual-only; never replace the dimensioned CAD geometry with
   an AI-refined mesh.
3. Optimise and inspect the GLB in a viewer. The default budget is 2.5 MB per
   asset; lower budgets are used for smaller props.
4. Copy the approved file to the manifest `outputPath`, then change `status`
   to `published` and record `outputBytes`, `outputSha256` and
   `outputLicense`.
5. Run:

   ```text
   pnpm check:ultrashape-assets
   pnpm check:studio-assets
   pnpm --filter @ai-estimate-studio/web test
   pnpm --filter @ai-estimate-studio/web build
   ```

The browser will select a published output automatically. If the file is not
published or fails validation, it keeps the fallback and the studio remains
usable.

## Boundaries

- UltraShape is never executed in GitHub Pages or in a visitor's browser.
- The studio shell, walls, roof, glazing and measurements stay in the
  parametric CAD-like model owned by ClayGL.
- Refined assets do not affect pricing, dimensions, validation or PDF totals.
- Check the UltraShape code, checkpoint and input-asset terms separately before
  publishing any generated derivative for a commercial demo.

See the [UltraShape repository](https://github.com/PKU-YuanGroup/UltraShape-1.0)
for the upstream inference requirements and the
`docs/viewer/ULTRASHAPE_INTEGRATION.md` decision record for the product
boundary.
