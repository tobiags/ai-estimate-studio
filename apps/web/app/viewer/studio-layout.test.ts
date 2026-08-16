import { describe, expect, it } from "vitest";
import {
  resolveStudioAssetPosition,
  studioPoolLayout,
  studioTerrainHalfWidth,
} from "./studio-layout";

describe("studio spatial layout", () => {
  it("keeps the pool outside every supported studio footprint", () => {
    for (const width of [1.25, 2.5, 3.75, 5]) {
      const pool = studioPoolLayout(width);
      expect(pool.x - pool.outerWidth / 2).toBeGreaterThan(width / 2);
      expect(pool.x + pool.outerWidth / 2).toBeLessThanOrEqual(
        studioTerrainHalfWidth,
      );
      expect(pool.waterWidth).toBeLessThan(pool.outerWidth);
    }
  });

  it("anchors contextual assets to the selected studio width", () => {
    const asset = {
      position: [0, -0.02, 1] as const,
      side: "left" as const,
      clearanceFromStudio: 0.8,
    };
    expect(resolveStudioAssetPosition(asset, 5)[0]).toBe(-3.3);
    expect(resolveStudioAssetPosition(asset, 1.25)[0]).toBe(-1.425);
  });
});
