# Reference image sources

## Mobup public asset policy

The active public scene is the modular garden studio. Its orbitable structure, materials and props are local assets; no Pergola, Pool or Landscape reference image is loaded into the public scene. A generated image can be retained as a labelled conceptual reference, but it must never be used as a 360-degree background plate.

The public configurator now exposes three local environment treatments around the same priced studio: Garden uses grass, path and planting-bed materials; Poolside uses the local mineral PBR deck and a water surface with coping; Terrace uses a cedar deck and planters. These are scene context layers, not separate product-family models or pricing inputs.

| Asset family | Required use | Licence / provenance |
| --- | --- | --- |
| Mobup CAD-like structure | Walls, base, roof and openings | Project-generated asset; source and checksum recorded beside the binary |
| Cedar / graphite / mineral PBR maps | Surface appearance only | Poly Haven CC0 or another licence explicitly recorded before commit |
| Mobup conceptual reference | Direction art and optional PDF thumbnail | Generated reference, not a measured survey and not interactive geometry |

All Mobup assets must declare a local URL, checksum, licence, byte size and whether they are critical to first paint. The initial critical bundle is capped at 6 MB; decorative assets are lazy-loaded or omitted.

| Local Mobup asset | Source | Licence | SHA-256 | Use |
| --- | --- | --- | --- | --- |
| `apps/web/public/assets/studio/materials/cedar/cedar_diff_1k.jpg` | [Poly Haven Japanese Cedar Planks](https://polyhaven.com/a/japanese_cedar_planks) | [CC0](https://polyhaven.com/license) | `cce8e8c5e5e6ba7956a6edf9fa6121c57fa2bfab0ebd672951bede9e053cbec4` | Cedar cladding |
| `apps/web/public/assets/studio/materials/mineral/mineral_diff_1k.jpg` | [Poly Haven Cobblestone Floor 01](https://polyhaven.com/a/cobblestone_floor_01) | [CC0](https://polyhaven.com/license) | `7630d6a59501cab4d2295b2be47bad892b8dae49895b4bee6bc26fd45c423e05` | Mineral ground colour |
| `apps/web/public/assets/studio/materials/mineral/mineral_nor_gl_1k.jpg` | [Poly Haven Cobblestone Floor 01](https://polyhaven.com/a/cobblestone_floor_01) | [CC0](https://polyhaven.com/license) | `e8a07bd38fdaeb92a419bc4829631847df7c03fd657dd32b44f19e2550a4fb35` | Mineral relief |
| `apps/web/public/assets/studio/materials/mineral/mineral_rough_1k.jpg` | [Poly Haven Cobblestone Floor 01](https://polyhaven.com/a/cobblestone_floor_01) | [CC0](https://polyhaven.com/license) | `18a5c4320378bc7eb17b2bc14981331912b1f0ff3100ced0a97aa59234377d41` | Mineral roughness |
| `apps/web/public/assets/studio/references/mobup-studio-concept-v1.png` | OpenAI image generation, prompt recorded in the implementation plan | Generated reference | `d041bce256b156fb8c7041e87eec3d6bed158bc23b67d66af91165525ed80d36` | Concept/PDF thumbnail only; never the 3D background |

The estimator uses locally cached reference photographs as thumbnails in the product selector. They are not presented as final customer deliverables and are intentionally not used as a background behind the interactive model; the viewer uses a neutral studio canvas so the generated geometry remains legible.

| Asset | Source | Licence | Use |
| --- | --- | --- | --- |
| `apps/web/public/assets/references/pergola.jpg` | [Unsplash — Building and trees seen through a wooden pergola](https://unsplash.com/photos/building-and-trees-seen-through-a-wooden-pergola-b0FC_lIA9Do) | Unsplash License | Pergola selector thumbnail |
| `apps/web/public/assets/references/pergola-real.jpg` | Product-team supplied reference: `Gemini_Generated_Image_rzi0ejrzi0ejrzi0.png` | Internal reference image | Pergola selector thumbnail and visual brief for the cedar scene |
| `apps/web/public/assets/references/pergola-real-generated.jpg` | OpenAI image generation from the product-team supplied reference | Generated visual reference; not a measured survey | High-resolution pergola selector thumbnail and visual brief for lighting, furniture and planting proportions |
| `apps/web/public/assets/references/pool.jpg` | [Unsplash — A swimming pool with a house in the background](https://unsplash.com/photos/a-swimming-pool-with-a-house-in-the-background-a0mhcnwhgOE) | Unsplash License | Pool selector thumbnail |
| `apps/web/public/assets/references/garden.jpg` | [Unsplash — Green grass field with red flowers and trees](https://unsplash.com/photos/green-grass-field-with-red-flowers-and-trees-57sqDCxX4Ik) | Unsplash License | Garden selector thumbnail |
| `apps/web/public/assets/environments/polyhaven-lapa-1k.hdr` | [Poly Haven - Lapa](https://polyhaven.com/a/lapa) | [CC0](https://polyhaven.com/license) | Local 1K HDRI for physically plausible reflections and ambient garden light |
| `apps/web/public/assets/models/polyhaven/painted_wooden_bench_1k/` | [Poly Haven - Painted Wooden Bench](https://polyhaven.com/a/painted_wooden_bench) | [CC0](https://polyhaven.com/license) | Local 1K GLTF prop loaded in the garden scene (geometry plus three JPEG maps) |
| `apps/web/public/assets/models/polyhaven/outdoor_table_chair_set_01/` | [Poly Haven - Outdoor Table Chair Set 01](https://polyhaven.com/a/outdoor_table_chair_set_01) | [CC0](https://polyhaven.com/license) | Local 1K GLTF furniture set for the pergola seating area |
| `apps/web/public/assets/models/polyhaven/potted_plant_01/` | [Poly Haven - Potted Plant 01](https://polyhaven.com/a/potted_plant_01) | [CC0](https://polyhaven.com/license) | Local 1K GLTF botanical asset instanced around the pergola |
| `apps/web/public/assets/models/polyhaven/grass_medium_01/` | [Poly Haven - Grass Medium 01](https://polyhaven.com/a/grass_medium_01) | [CC0](https://polyhaven.com/license) | Local 1K GLTF ground-cover tufts placed around the patio |
| `apps/web/public/assets/models/polyhaven/stone_fire_pit/` | [Poly Haven - Stone Fire Pit](https://polyhaven.com/a/stone_fire_pit) | [CC0](https://polyhaven.com/license) | Local 1K GLTF outdoor accessory in the pergola scene |
| `apps/web/public/assets/models/polyhaven/Lantern_01/` | [Poly Haven - Lantern 01](https://polyhaven.com/a/Lantern_01) | [CC0](https://polyhaven.com/license) | Local 1K GLTF lanterns used as real lighting props |
| `apps/web/public/assets/materials/polyhaven/japanese_cedar_planks_diff_1k.jpg` | [Poly Haven - Japanese Cedar Planks](https://polyhaven.com/a/japanese_cedar_planks) | [CC0](https://polyhaven.com/license) | Local 1K albedo map for the cedar pergola frame and deck |
| `apps/web/public/assets/materials/polyhaven/cobblestone_floor_01/` | [Poly Haven - Cobblestone Floor 01](https://polyhaven.com/a/cobblestone_floor_01) | [CC0](https://polyhaven.com/license) | Local 1K diffuse, normal and roughness maps for the PBR patio substrate |
| `apps/web/public/assets/models/cad/cedar_pergola.glb` | [earthtojake/text-to-cad](https://github.com/earthtojake/text-to-cad) CAD export from `tools/cad/cedar_pergola.step.py` | [MIT](https://github.com/earthtojake/text-to-cad/blob/main/LICENSE) for the source workflow; project-generated asset | Dimensioned CAD-derived pergola structure used as the primary web geometry; Poly Haven texture is applied at runtime |
| `apps/web/public/assets/models/cad/cobblestone_ground.glb` | Project-generated GLB from `tools/assets/generate-cobblestone-ground.mjs` with [Poly Haven - Cobblestone Floor 01](https://polyhaven.com/a/cobblestone_floor_01) maps | Project-generated mesh plus [CC0](https://polyhaven.com/license) maps | Real GLB patio carrier with Poly Haven diffuse and roughness maps; replaces the procedural ground plane for the pergola scene |

The image-to-3D structure follows the staged, spec-first approach from [img2threejs](https://github.com/img2threejs/img2threejs): reference intake, procedural structural pass, material pass and interaction metadata. The current browser implementation is intentionally honest about single-view uncertainty: it provides an editable spatial estimate, while production photogrammetric assets will be supplied by a provider adapter that emits GLB/GLTF.

## Poly Haven environment

The viewer uses the locally cached `Lapa` HDRI from Poly Haven as an environment map, not as a flat backdrop. It contributes soft garden-context reflections to the pergola, pool and landscape materials while the canvas keeps its dark studio background so the geometry stays legible. The 1K HDR file is 1,725,562 bytes (MD5 `0CE666A0CA4A1ECD421461FD6D39B101`), which keeps the static GitHub Pages build within the viewer transfer budget.

The garden scene also loads one selective real prop, Poly Haven's painted wooden bench, through the generic GLTF loader. Its local 1K package is 1,989,639 bytes and is lazy-loaded only when the garden product is selected; if it cannot load, the procedural garden remains visible.

The supplied pergola image is treated as a visual brief: the default finish is now cedar, with a raised plank deck, overhanging fascia and real GLTF furniture, plants, grass cover, lanterns and fire pit. The implementation remains true 3D geometry, so orbit and zoom reveal the structure instead of presenting the reference as a background plate.

The structural pergola is generated from a STEP-first parametric source and exported to a meter-scaled GLB. The CAD asset is intentionally limited to the load-bearing frame, deck boards and roof rafters; furniture, planting, ground-cover, patio PBR maps and lighting remain separate viewer layers so pricing dimensions can scale the structure without baking the decorative scene into the CAD model.

Poly Haven states that its asset files are CC0 and can be used commercially without attribution. The repository records the source URL and the asset checksum so the binary can be replaced deterministically if the upstream catalog changes; Poly Haven website metadata itself is not redistributed.

## Pipeline validation

The downloaded pergola reference was passed through the repository's technical probe (`probe_image.py`) successfully. The generated environment spec is intentionally blocked by the repository's strict-quality gate because the source is a multi-object environment rather than an isolated object with enough authored detail inventory and PBR evidence. The app therefore uses a named procedural factory for this first tranche and preserves that blocked result as a quality signal instead of claiming photogrammetric fidelity.
