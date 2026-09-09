import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const manifestPath = join(
  root,
  "apps",
  "web",
  "app",
  "studio",
  "assets.manifest.json",
);
const publicRoot = join(root, "apps", "web", "public");
const forbidden =
  /(?:^|[\\/_-])(pergola|pool|garden|firepit|lantern|grass)(?:[\\/_\-.]|$)/i;
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const errors = [];
const keys = new Set();
let criticalBytes = 0;

for (const asset of manifest) {
  if (keys.has(asset.key)) errors.push(`duplicate key: ${asset.key}`);
  keys.add(asset.key);
  const localAsset =
    asset.url.startsWith("/assets/studio/") ||
    asset.url.startsWith("/assets/models/studio/");
  if (!localAsset) errors.push(`non-local URL: ${asset.key}`);
  if (!asset.license) errors.push(`missing license: ${asset.key}`);
  if (!Number.isSafeInteger(asset.bytes) || asset.bytes <= 0)
    errors.push(`invalid byte declaration: ${asset.key}`);
  if (!/^[a-f0-9]{64}$/.test(asset.sha256))
    errors.push(`invalid sha256: ${asset.key}`);
  if (forbidden.test(asset.url))
    errors.push(`retired asset path: ${asset.url}`);
  const absolute = normalize(join(publicRoot, asset.url.slice(1)));
  if (!absolute.startsWith(normalize(publicRoot)))
    errors.push(`path escapes public root: ${asset.key}`);
  const bytes = await readFile(absolute).catch(() => null);
  if (!bytes) {
    errors.push(`missing asset: ${asset.url}`);
    continue;
  }
  if (bytes.byteLength !== asset.bytes)
    errors.push(
      `byte drift: ${asset.key} (${bytes.byteLength} != ${asset.bytes})`,
    );
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (sha256 !== asset.sha256) errors.push(`sha256 drift: ${asset.key}`);
  if (asset.critical) criticalBytes += bytes.byteLength;
}

if (criticalBytes > 6_000_000)
  errors.push(`critical asset budget exceeded: ${criticalBytes}`);
if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(
  `Mobup asset guard passed: ${manifest.length} assets, ${criticalBytes} critical bytes.`,
);
