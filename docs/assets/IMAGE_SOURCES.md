# Reference image sources

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
| `apps/web/public/assets/materials/polyhaven/japanese_cedar_planks_diff_1k.jpg` | [Poly Haven - Japanese Cedar Planks](https://polyhaven.com/a/japanese_cedar_planks) | [CC0](https://polyhaven.com/license) | Local 1K albedo map for the cedar pergola frame and deck |

The image-to-3D structure follows the staged, spec-first approach from [img2threejs](https://github.com/img2threejs/img2threejs): reference intake, procedural structural pass, material pass and interaction metadata. The current browser implementation is intentionally honest about single-view uncertainty: it provides an editable spatial estimate, while production photogrammetric assets will be supplied by a provider adapter that emits GLB/GLTF.

## Poly Haven environment

The viewer uses the locally cached `Lapa` HDRI from Poly Haven as an environment map, not as a flat backdrop. It contributes soft garden-context reflections to the pergola, pool and landscape materials while the canvas keeps its dark studio background so the geometry stays legible. The 1K HDR file is 1,725,562 bytes (MD5 `0CE666A0CA4A1ECD421461FD6D39B101`), which keeps the static GitHub Pages build within the viewer transfer budget.

The garden scene also loads one selective real prop, Poly Haven's painted wooden bench, through the generic GLTF loader. Its local 1K package is 1,989,639 bytes and is lazy-loaded only when the garden product is selected; if it cannot load, the procedural garden remains visible.

The supplied pergola image is treated as a visual brief: the default finish is now cedar, with a raised plank deck, overhanging fascia, outdoor table/chairs and climbing vines. The implementation remains true 3D geometry, so orbit and zoom reveal the structure instead of presenting the reference as a background plate.

Poly Haven states that its asset files are CC0 and can be used commercially without attribution. The repository records the source URL and the asset checksum so the binary can be replaced deterministically if the upstream catalog changes; Poly Haven website metadata itself is not redistributed.

## Pipeline validation

The downloaded pergola reference was passed through the repository's technical probe (`probe_image.py`) successfully. The generated environment spec is intentionally blocked by the repository's strict-quality gate because the source is a multi-object environment rather than an isolated object with enough authored detail inventory and PBR evidence. The app therefore uses a named procedural factory for this first tranche and preserves that blocked result as a quality signal instead of claiming photogrammetric fidelity.
