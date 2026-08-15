import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const manifestPath = join(
  root,
  "apps",
  "web",
  "app",
  "studio",
  "ultrashape-assets.manifest.json",
);
const publicRoot = join(root, "apps", "web", "public");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const errors = [];
const ids = new Set();
let pending = 0;
let published = 0;

const toPublicFile = async (assetPath, label) => {
  if (typeof assetPath !== "string" || !assetPath.startsWith("/assets/")) {
    errors.push(`non-local ${label}: ${assetPath}`);
    return null;
  }
  const absolute = normalize(join(publicRoot, assetPath.slice(1)));
  if (!absolute.startsWith(normalize(publicRoot))) {
    errors.push(`path escapes public root: ${label}`);
    return null;
  }
  try {
    await access(absolute);
  } catch {
    errors.push(`missing ${label}: ${assetPath}`);
    return null;
  }
  return absolute;
};

if (!Array.isArray(manifest)) errors.push("manifest must be an array");

for (const asset of Array.isArray(manifest) ? manifest : []) {
  if (typeof asset.id !== "string" || asset.id.length === 0) {
    errors.push("missing asset id");
    continue;
  }
  if (ids.has(asset.id)) errors.push(`duplicate asset id: ${asset.id}`);
  ids.add(asset.id);
  if (asset.provider !== "ultrashape-1.0")
    errors.push(`invalid provider: ${asset.id}`);
  if (!asset.source?.startsWith("https://"))
    errors.push(`invalid source: ${asset.id}`);
  if (asset.role !== "DECORATIVE")
    errors.push(`non-decorative output: ${asset.id}`);
  if (asset.dimensionAuthority !== "VISUAL_ONLY")
    errors.push(`dimension authority must stay visual-only: ${asset.id}`);
  if (!Number.isSafeInteger(asset.maxBytes) || asset.maxBytes <= 0)
    errors.push(`invalid maxBytes: ${asset.id}`);

  await toPublicFile(asset.inputImage, `${asset.id}.inputImage`);
  await toPublicFile(asset.coarseMesh, `${asset.id}.coarseMesh`);
  await toPublicFile(asset.fallbackPath, `${asset.id}.fallbackPath`);
  if (
    typeof asset.outputPath !== "string" ||
    !asset.outputPath.startsWith("/assets/models/refined/ultrashape/")
  ) {
    errors.push(`invalid output path: ${asset.id}`);
  }

  if (asset.status === "pending") {
    pending += 1;
    continue;
  }
  if (asset.status !== "published") {
    errors.push(`invalid status: ${asset.id}`);
    continue;
  }
  published += 1;
  const output = await toPublicFile(asset.outputPath, `${asset.id}.outputPath`);
  if (!output) continue;
  const bytes = await readFile(output);
  if (bytes.byteLength > asset.maxBytes)
    errors.push(`output exceeds budget: ${asset.id}`);
  if (bytes.byteLength !== asset.outputBytes)
    errors.push(`output byte drift: ${asset.id}`);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (sha256 !== asset.outputSha256)
    errors.push(`output sha256 drift: ${asset.id}`);
  if (!asset.outputLicense || asset.outputLicense === "PENDING_REVIEW")
    errors.push(`missing reviewed output license: ${asset.id}`);
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(
  `UltraShape asset guard passed: ${pending} pending, ${published} published, ${ids.size} total.`,
);
