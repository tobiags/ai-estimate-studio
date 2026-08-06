# Reference image sources

The estimator uses locally cached reference photographs as visual context for the generated scene. They are not presented as final customer deliverables; they anchor the procedural reconstruction and make the relationship between reference and model explicit.

| Asset | Source | Licence | Use |
| --- | --- | --- | --- |
| `apps/web/public/assets/references/pergola.jpg` | [Unsplash — Building and trees seen through a wooden pergola](https://unsplash.com/photos/building-and-trees-seen-through-a-wooden-pergola-b0FC_lIA9Do) | Unsplash License | Pergola reference/background |
| `apps/web/public/assets/references/pool.jpg` | [Unsplash — A swimming pool with a house in the background](https://unsplash.com/photos/a-swimming-pool-with-a-house-in-the-background-a0mhcnwhgOE) | Unsplash License | Pool reference/background |
| `apps/web/public/assets/references/garden.jpg` | [Unsplash — Green grass field with red flowers and trees](https://unsplash.com/photos/green-grass-field-with-red-flowers-and-trees-57sqDCxX4Ik) | Unsplash License | Garden reference/background |

The image-to-3D structure follows the staged, spec-first approach from [img2threejs](https://github.com/img2threejs/img2threejs): reference intake, procedural structural pass, material pass and interaction metadata. The current browser implementation is intentionally honest about single-view uncertainty: it provides an editable spatial estimate, while production photogrammetric assets will be supplied by a provider adapter that emits GLB/GLTF.

## Pipeline validation

The downloaded pergola reference was passed through the repository's technical probe (`probe_image.py`) successfully. The generated environment spec is intentionally blocked by the repository's strict-quality gate because the source is a multi-object environment rather than an isolated object with enough authored detail inventory and PBR evidence. The app therefore uses a named procedural factory for this first tranche and preserves that blocked result as a quality signal instead of claiming photogrammetric fidelity.
