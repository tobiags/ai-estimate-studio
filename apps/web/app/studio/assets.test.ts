import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  studioAssets,
  studioCriticalAssetBytes,
  studioCriticalAssetBudgetBytes,
  validateStudioAssetManifest,
} from "./assets";

describe("Mobup asset manifest", () => {
  it("has unique local licensed assets within the critical transfer budget", () => {
    expect(validateStudioAssetManifest()).toEqual([]);
    expect(studioCriticalAssetBytes()).toBeLessThan(
      studioCriticalAssetBudgetBytes,
    );
    expect(new Set(studioAssets.map((asset) => asset.key)).size).toBe(
      studioAssets.length,
    );
  });

  it("points every committed asset to an existing public file", () => {
    const publicRoot = existsSync(join(process.cwd(), "public"))
      ? join(process.cwd(), "public")
      : join(process.cwd(), "apps", "web", "public");
    expect(
      studioAssets.every((asset) =>
        existsSync(join(publicRoot, asset.url.slice(1))),
      ),
    ).toBe(true);
  });

  it("rejects duplicate, remote, unlicensed and oversized manifest entries", () => {
    const invalid = [
      { ...studioAssets[0]!, key: studioAssets[1]!.key },
      { ...studioAssets[0]!, url: "https://example.com/a.jpg" },
      {
        ...studioAssets[0]!,
        license: "CC0" as const,
        bytes: 9_000_000,
        critical: true,
      },
      { ...studioAssets[0]!, sha256: "bad" },
      { ...studioAssets[0]!, license: "" as never },
    ];
    expect(validateStudioAssetManifest(invalid)).toEqual(
      expect.arrayContaining([
        "DUPLICATE_KEY:cedar-diff-1k",
        "NON_LOCAL_URL:cedar-diff-1k",
        "CRITICAL_BUNDLE_OVER_BUDGET",
        "INVALID_SHA256:cedar-diff-1k",
        "MISSING_LICENSE:cedar-diff-1k",
      ]),
    );
  });
});
