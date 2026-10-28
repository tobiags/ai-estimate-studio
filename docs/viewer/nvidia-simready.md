# NVIDIA SimReady furniture

## Scope and selection

The [SimReady Central catalogue](https://huggingface.co/spaces/nvidia/simready-central)
indexes many providers. This integration uses only the public
[NVIDIA dataset](https://huggingface.co/datasets/nvidia/simready-assets), pinned to
revision `653d91e182011f357cf1644013cc94ddf194d349`.

The catalogue is predominantly industrial. No garden vegetation or complete
architectural scene was selected from it. Existing Poly Haven exterior props,
studio dimensions, facade configuration and pricing remain unchanged.

| Asset folder | Use | Dimensions in Blender, metres | Triangles | GLB bytes |
| --- | --- | --- | --- | --- |
| `chair_office_amf_black_a01` | P1 interior chair | 0.540 × 0.572 × 0.810 | 32,253 | 2,266,084 |
| `sofa_soft_b02` | P2–P4 interior sofa | 0.703 × 1.526 × 0.728 | 29,720 | 1,317,264 |
| `furniture_table_coffee_low_a01` | P2–P4 coffee table | 0.600 × 1.200 × 0.443 | 9,908 | 629,640 |

P1 loads approximately 2.27 MB of furniture; P2–P4 load 1.95 MB. These assets
are contextual furniture, not products included in the estimate.

## Licence and attribution

Each downloaded `com.nvidia.simready.packaging.json` identifies CC-BY-4.0.
The source USD metadata identifies NVIDIA as author. The derivatives retain
attribution and a modification notice in
`apps/web/public/assets/models/nvidia/ATTRIBUTION.txt`, linked from the viewer.
Do not assume the same licence for other Central providers.

## Conversion pipeline

Run `python scripts/fetch-simready.py chair_office_amf_black_a01 sofa_soft_b02
furniture_table_coffee_low_a01` with `usd-core` installed. It downloads only
referenced visual dependencies to `outputs/simready-source`.

Then run Blender in background with `-t 2 -P scripts/convert-simready.py --`
followed by the same three asset identifiers. Results go to
`outputs/simready-web`; review them before copying GLBs to the public asset folder.

1. Download `simready_usd/sm_<asset_folder>_01.usd` and its visual layers from
   the pinned revision, preserving relative paths.
2. Follow USD references to `payloads/base.usda`, `instances.usda`,
   `geometries.usd`, `materials.usda` and every referenced `Textures` image.
   Use `usd-core` to inspect layers. The full dataset is not required.
3. Import using Blender 5.2.2 LTS USD import. Only USD Preview Surface is used;
   MDL source and MuJoCo/Newton/PhysX simulation payloads are excluded.
   Warnings about these intentionally absent physics layers are expected.
4. Preserve metre scale, centre the footprint and move its bottom to Z=0.
5. Detach the imported visual mesh from USD collection instancing and remove
   instance empties. Otherwise glTF exports both prototype and instance,
   producing duplicate overlapping geometry. QA must check the reimported GLB,
   not just the USD scene.
6. Decimate meshes above 18,000 polygons with ratio `18000 / polygon_count`.
   Resize image maps to a maximum edge of 1024. Export GLB with applied
   modifiers, no animation, JPEG quality 85. Preserve UV tiling and PBR maps.
7. Run Blender asset QA on the exported and reimported GLB, then inspect
   material and wireframe views plus the integrated browser scene.

## Placement contract

`studioInteriorAssetPlan` is shared by ClayGL and the Three.js fallback.
Furniture uses scale 1 and a floor level of 0.235 m. P1 uses a compact chair.
P2–P4 use the sofa rotated across the back wall and the table in front.
The sofa remains 0.31 m clear of the table, and fits the 2.5 m base without
crossing the side walls. Switching environment does not alter this arrangement.

The Blender authoring equivalent is `interior(width)` in
`scripts/blender-studio-scenes.py`. Furniture is added after the standalone CAD
shell export, so the building GLBs do not bake furniture into the structure.

## Verification and accepted warnings

All three reimported GLBs pass the game asset QA profile with no errors.
UV/normal seam duplicates, tiled/stacked sofa UVs and internal opposing faces
are accepted: these preserve the supplied materials, are not intended for
unique lightmap baking, and do not cause visible z-fighting. No physics,
collision or printable-watertight guarantee is made for these decorative props.

Integration checks cover all four widths, local asset paths, attribution,
metre scale and furniture spacing. Browser review covers orbit, zoom and
garden/pool/terrace switching. Rendered previews are not a substitute for the
interactive scene; they may differ in lighting.
