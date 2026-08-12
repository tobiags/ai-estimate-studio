export type StudioAsset = Readonly<{
  key: string;
  url: string;
  kind: "PBR_TEXTURE" | "REFERENCE";
  role: "CEDAR" | "MINERAL" | "CONCEPT_REFERENCE";
  license: "CC0" | "GENERATED_REFERENCE";
  source: string;
  bytes: number;
  sha256: string;
  critical: boolean;
}>;

export const studioAssets: readonly StudioAsset[] = Object.freeze([
  {
    key: "cedar-diff-1k",
    url: "/assets/studio/materials/cedar/cedar_diff_1k.jpg",
    kind: "PBR_TEXTURE",
    role: "CEDAR",
    license: "CC0",
    source: "https://polyhaven.com/a/japanese_cedar_planks",
    bytes: 704030,
    sha256: "cce8e8c5e5e6ba7956a6edf9fa6121c57fa2bfab0ebd672951bede9e053cbec4",
    critical: true,
  },
  {
    key: "mineral-diff-1k",
    url: "/assets/studio/materials/mineral/mineral_diff_1k.jpg",
    kind: "PBR_TEXTURE",
    role: "MINERAL",
    license: "CC0",
    source: "https://polyhaven.com/a/cobblestone_floor_01",
    bytes: 459525,
    sha256: "7630d6a59501cab4d2295b2be47bad892b8dae49895b4bee6bc26fd45c423e05",
    critical: true,
  },
  {
    key: "mineral-normal-1k",
    url: "/assets/studio/materials/mineral/mineral_nor_gl_1k.jpg",
    kind: "PBR_TEXTURE",
    role: "MINERAL",
    license: "CC0",
    source: "https://polyhaven.com/a/cobblestone_floor_01",
    bytes: 785399,
    sha256: "e8a07bd38fdaeb92a419bc4829631847df7c03fd657dd32b44f19e2550a4fb35",
    critical: false,
  },
  {
    key: "mineral-roughness-1k",
    url: "/assets/studio/materials/mineral/mineral_rough_1k.jpg",
    kind: "PBR_TEXTURE",
    role: "MINERAL",
    license: "CC0",
    source: "https://polyhaven.com/a/cobblestone_floor_01",
    bytes: 327745,
    sha256: "18a5c4320378bc7eb17b2bc14981331912b1f0ff3100ced0a97aa59234377d41",
    critical: false,
  },
  {
    key: "mobup-concept-v1",
    url: "/assets/studio/references/mobup-studio-concept-v1.png",
    kind: "REFERENCE",
    role: "CONCEPT_REFERENCE",
    license: "GENERATED_REFERENCE",
    source:
      "OpenAI image generation prompt recorded in the Task 5 implementation log",
    bytes: 2269106,
    sha256: "d041bce256b156fb8c7041e87eec3d6bed158bc23b67d66af91165525ed80d36",
    critical: false,
  },
]);

export const studioCriticalAssetBudgetBytes = 6_000_000;

export function studioCriticalAssetBytes(
  assets: readonly StudioAsset[] = studioAssets,
): number {
  return assets
    .filter((asset) => asset.critical)
    .reduce((total, asset) => total + asset.bytes, 0);
}

export function validateStudioAssetManifest(
  assets: readonly StudioAsset[] = studioAssets,
): readonly string[] {
  const issues: string[] = [];
  const keys = new Set<string>();
  for (const asset of assets) {
    if (keys.has(asset.key)) issues.push(`DUPLICATE_KEY:${asset.key}`);
    keys.add(asset.key);
    if (!asset.url.startsWith("/assets/studio/")) {
      issues.push(`NON_LOCAL_URL:${asset.key}`);
    }
    if (!asset.license) issues.push(`MISSING_LICENSE:${asset.key}`);
    if (!Number.isSafeInteger(asset.bytes) || asset.bytes <= 0) {
      issues.push(`INVALID_BYTES:${asset.key}`);
    }
    if (!/^[a-f0-9]{64}$/.test(asset.sha256)) {
      issues.push(`INVALID_SHA256:${asset.key}`);
    }
  }
  if (studioCriticalAssetBytes(assets) > studioCriticalAssetBudgetBytes) {
    issues.push("CRITICAL_BUNDLE_OVER_BUDGET");
  }
  return Object.freeze(issues);
}
