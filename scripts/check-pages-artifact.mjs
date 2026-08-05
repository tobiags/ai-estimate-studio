import { existsSync, readdirSync } from "node:fs";
import { basename, extname, join } from "node:path";

const artifactRoot = "docs/.vitepress/dist";
const requiredFiles = [
  "index.html",
  "product/PRODUCT_SPEC.html",
  "api/API.html",
];
const forbiddenNames = new Set([
  ".env",
  ".env.local",
  "package.json",
  "pnpm-lock.yaml",
  "openapi.yaml",
]);
const forbiddenExtensions = new Set([".map", ".ts", ".tsx", ".zip"]);
const failures = [];

function inspect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      inspect(path);
      continue;
    }

    if (
      forbiddenNames.has(basename(path)) ||
      forbiddenExtensions.has(extname(path).toLowerCase())
    ) {
      failures.push(path);
    }
  }
}

if (!existsSync(artifactRoot)) {
  failures.push(`${artifactRoot} is missing`);
} else {
  inspect(artifactRoot);
}

for (const requiredFile of requiredFiles) {
  if (!existsSync(join(artifactRoot, requiredFile))) {
    failures.push(`${requiredFile} is missing from the Pages artifact`);
  }
}

if (failures.length > 0) {
  process.stderr.write(`Invalid Pages artifact:\n${failures.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write("Verified documentation-only GitHub Pages artifact.\n");
}
