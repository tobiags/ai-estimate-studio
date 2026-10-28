# Blender scene authoring

NVIDIA interior furniture and its conversion/QA contract are documented in
[NVIDIA SimReady furniture](./nvidia-simready.md).

## Scope

The Blender authoring pipeline refines the existing dimensioned Mobup CAD models.
The four supported compositions remain P1/M1, P2/M7, P3/M8 and P4/M1+M8.
Each composition has garden, poolside and terrace presentation settings.
Prices, configuration rules and nominal dimensions remain catalogue data.

Blender is an offline authoring dependency. Visitors load exported GLB files;
the public website does not require Blender, an MCP server or paid AI services.

## Local installation

Blender 5.2.2 LTS was verified on Windows with an NVIDIA RTX 4050 Laptop GPU.
The upstream sources are cloned outside the application checkout under
`tools/blender-vendor` in the task workspace.

| Source | Role | Status |
| --- | --- | --- |
| [MCP for Blender](https://github.com/ahujasid/mcp-for-blender) | Codex-to-Blender commands | Installed; localhost transport smoke-tested |
| [Blender Skills](https://github.com/EL4CTEO/blender-skills) | Modeling, PBR, export, rendering and QA workflows | 22 skills installed for Codex |
| [MCP Pro](https://github.com/LiCinCan/blender-ai-mcp-addon) | Optional Blender chat and second MCP implementation | Installed, disabled to avoid a competing listener |
| [Scenario](https://github.com/scenario-labs/blender-plugin) | Optional generation and material tools | Built, validated and installed; cloud generation not configured |

MCP Pro uses port 9876 by default, as does MCP for Blender. Enable only one
of these implementations on that port. Scenario generation requires its own
account, API credentials and Creative Units; no paid generation was used.

The background adapter in the task workspace drains the upstream command queue
on Blender's main thread. This is necessary because the upstream addon refuses
normal GUI-timer startup with `--background`. It listens only on `127.0.0.1:9876`.
The user's visible Blender session and desktop input are not used.
Telemetry is disabled. The MCP endpoint executes Python within Blender and must
remain local; never expose it through a public tunnel.

## Authoring command

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' `
  --background --factory-startup --threads 2 --python-exit-code 1 `
  --python scripts/blender-studio-scenes.py -- --out C:/path/to/review
```

Use `--variants p4-m1-m8` or `--environments poolside` for a focused revision.
Use `--no-render` to export without rendering. Default output is twelve editable
BLEND files, twelve scene GLBs, twelve Cycles PNGs, four structure GLBs and a
JSON manifest. Generated artifacts are written to the explicit output directory;
the script does not replace the source assets in `public`.

## Geometry and materials

- Preserve catalogue widths, 3.00 m depth and the existing 2.80 m wall geometry.
- Rebuild separate, non-overlapping display surfaces at the CAD envelope
  dimensions. Keep glazing separate and batch the meshes by material.
- Add millimetre-scale edge bevels and metric UV projection.
- Use image textures connected to Principled BSDF for GLB compatibility.
- Keep painted graphite dielectric; use clear, low-roughness glass.
- Use existing licensed Poly Haven furniture, plants and lighting assets.
- Use the Poly Haven Lapa HDRI for illumination and reflections, with a neutral
  camera background. No photograph substitutes for scene geometry.
- Keep the pool beside the building with an explicit footprint clearance.
- Keep furniture outside the studio footprint and support the deck on the site.

The added grass texture is [Poly Haven grass_ground](https://polyhaven.com/a/grass_ground),
CC0, 1K diffuse JPEG. Existing asset provenance remains in the project manifests.

## Verification and promotion

1. Run the Blender Skills asset QA on each structure and inspect all error entries.
2. Render material and wireframe multi-angle contact sheets.
3. Re-import exported GLBs and check geometry, dimensions and file sizes.
4. Test orbit, zoom and environment switching in the browser review page.
5. Keep full scene GLBs separate from the lightweight configurator structure.
6. Promote a structure only after validation; update its declared byte size and
   SHA-256 in `apps/web/app/studio/assets.manifest.json` in the same change.

The Cycles image and browser view use different renderers. A Cycles PNG alone
does not establish equivalent quality or performance in ClayGL or Three.js.

## Verified authoring run, 21 October 2026

- Four revised structure GLBs promoted into the existing configurator paths.
- Twelve BLEND scenes, twelve standalone scene GLBs and twelve Cycles PNGs
  produced in the task workspace under `outputs/blender-mobup-v2`.
- Nominal studio widths preserved: 1.25, 2.50, 3.75 and 5.00 m. The full mesh
  envelope includes fascia and plinth: width plus 0.22 m, height 3.02 m,
  depth 3.22 m, matching the previous CAD envelope.
- Five material batches per glazed studio; the opaque P1 uses four.
- Structure QA reports zero errors on all four variants. Accepted warnings
  concern UV/normal vertex splits, hidden back-to-back assembly faces and
  the intentional 0.04 m plinth below the reference plane. These are display
  meshes, not a merged solid intended for fabrication or 3D printing.
- Physical topology is checked after welding UV and normal seams on a copy;
  four dimension and watertight-component checks pass.
- Pool water clearance from the building footprint is 0.875 m in every pool
  scene. Furniture footprint assertions pass in all twelve scenes.
- Material and wire review sheets cover six views of the P4 structure.
- Web tests: 18 test files and 48 tests pass. The asset guard reports
  5,055,155 critical bytes, below the existing 6,000,000-byte budget.
- Configurator browser smoke test: model loads, orbit and zoom work, pool
  environment switches, and no console errors were reported.

The full authored surroundings remain separately reviewable; the configurator
uses the revised lightweight structures with its existing environment composer.
