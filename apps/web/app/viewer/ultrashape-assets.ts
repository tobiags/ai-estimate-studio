import manifest from "../studio/ultrashape-assets.manifest.json";

export type UltraShapeAssetManifestEntry = Readonly<{
  id: string;
  environment: "garden" | "pool" | "terrace";
  provider: "ultrashape-1.0";
  status: "pending" | "published";
  inputImage: string;
  coarseMesh: string;
  fallbackPath: string;
  outputPath: string;
  role: "DECORATIVE";
  dimensionAuthority: "VISUAL_ONLY";
  source: string;
  maxBytes: number;
  outputBytes?: number;
  outputSha256?: string;
  outputLicense?: string;
}>;

export type UltraShapeAssetResolution = Readonly<{
  path: string;
  refined: boolean;
  provider?: "ultrashape-1.0";
}>;

export const ultraShapeAssetManifest = Object.freeze(
  manifest as readonly UltraShapeAssetManifestEntry[],
);

const entriesById = new Map(
  ultraShapeAssetManifest.map((entry) => [entry.id, entry]),
);

const isLocalAssetPath = (path: string) => path.startsWith("/assets/");

export function getUltraShapeAssetRefinement(
  id: string,
): UltraShapeAssetManifestEntry | undefined {
  return entriesById.get(id);
}

export function resolveUltraShapeAssetPath(
  fallbackPath: string,
  refinement: UltraShapeAssetManifestEntry | undefined,
): UltraShapeAssetResolution {
  if (
    refinement?.status === "published" &&
    isLocalAssetPath(refinement.outputPath)
  ) {
    return Object.freeze({
      path: refinement.outputPath,
      refined: true,
      provider: refinement.provider,
    });
  }
  return Object.freeze({ path: fallbackPath, refined: false });
}

export function validateUltraShapeAssetManifest(
  assets: readonly UltraShapeAssetManifestEntry[] = ultraShapeAssetManifest,
): readonly string[] {
  const issues: string[] = [];
  const ids = new Set<string>();
  for (const asset of assets) {
    if (ids.has(asset.id)) issues.push(`DUPLICATE_ID:${asset.id}`);
    ids.add(asset.id);
    if (asset.provider !== "ultrashape-1.0")
      issues.push(`INVALID_PROVIDER:${asset.id}`);
    if (!isLocalAssetPath(asset.inputImage))
      issues.push(`NON_LOCAL_INPUT:${asset.id}`);
    if (!isLocalAssetPath(asset.coarseMesh))
      issues.push(`NON_LOCAL_COARSE_MESH:${asset.id}`);
    if (!isLocalAssetPath(asset.fallbackPath))
      issues.push(`NON_LOCAL_FALLBACK:${asset.id}`);
    if (!asset.outputPath.startsWith("/assets/models/refined/ultrashape/"))
      issues.push(`INVALID_OUTPUT_PATH:${asset.id}`);
    if (!Number.isSafeInteger(asset.maxBytes) || asset.maxBytes <= 0)
      issues.push(`INVALID_MAX_BYTES:${asset.id}`);
    if (asset.status === "published") {
      const outputBytes = asset.outputBytes;
      if (
        typeof outputBytes !== "number" ||
        !Number.isSafeInteger(outputBytes) ||
        outputBytes <= 0
      )
        issues.push(`MISSING_OUTPUT_BYTES:${asset.id}`);
      if (!asset.outputSha256 || !/^[a-f0-9]{64}$/.test(asset.outputSha256))
        issues.push(`INVALID_OUTPUT_SHA256:${asset.id}`);
      if (!asset.outputLicense)
        issues.push(`MISSING_OUTPUT_LICENSE:${asset.id}`);
    }
  }
  return Object.freeze(issues);
}
