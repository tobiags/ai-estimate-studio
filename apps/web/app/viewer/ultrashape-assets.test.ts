import { describe, expect, it } from "vitest";
import {
  ultraShapeAssetManifest,
  resolveUltraShapeAssetPath,
  validateUltraShapeAssetManifest,
} from "./ultrashape-assets";

describe("UltraShape asset contract", () => {
  it("keeps all current entries pending and valid", () => {
    expect(validateUltraShapeAssetManifest()).toEqual([]);
    expect(
      ultraShapeAssetManifest.every((asset) => asset.status === "pending"),
    ).toBe(true);
  });

  it("uses the fallback until a published local output exists", () => {
    const pending = ultraShapeAssetManifest[0];
    expect(pending).toBeDefined();
    expect(resolveUltraShapeAssetPath(pending!.fallbackPath, pending)).toEqual({
      path: pending!.fallbackPath,
      refined: false,
    });
  });

  it("selects a published output without changing its visual-only boundary", () => {
    const pending = ultraShapeAssetManifest[0]!;
    const published = {
      ...pending,
      status: "published" as const,
      outputBytes: 42,
      outputSha256: "a".repeat(64),
      outputLicense: "REVIEWED",
    };
    expect(resolveUltraShapeAssetPath(pending.fallbackPath, published)).toEqual(
      {
        path: pending.outputPath,
        refined: true,
        provider: "ultrashape-1.0",
      },
    );
    expect(published.dimensionAuthority).toBe("VISUAL_ONLY");
  });

  it("rejects a published entry without provenance", () => {
    const pending = ultraShapeAssetManifest[0]!;
    expect(
      validateUltraShapeAssetManifest([
        {
          ...pending,
          status: "published",
        },
      ]),
    ).toEqual(
      expect.arrayContaining([
        `MISSING_OUTPUT_BYTES:${pending.id}`,
        `INVALID_OUTPUT_SHA256:${pending.id}`,
        `MISSING_OUTPUT_LICENSE:${pending.id}`,
      ]),
    );
  });
});
