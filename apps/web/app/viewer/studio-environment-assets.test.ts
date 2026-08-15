import { describe, expect, it } from "vitest";
import {
  studioEnvironmentAssetPlans,
  type StudioEnvironmentAssetPlacement,
} from "./studio-environment-assets";
import {
  ultraShapeAssetManifest,
  validateUltraShapeAssetManifest,
} from "./ultrashape-assets";

describe("studio environment asset plans", () => {
  it("uses local Poly Haven assets for every exterior", () => {
    for (const environment of ["garden", "pool", "terrace"] as const) {
      const plan = studioEnvironmentAssetPlans[environment];
      expect(plan.length).toBeGreaterThanOrEqual(2);
      expect(plan.every((asset) => asset.path.startsWith("/assets/"))).toBe(
        true,
      );
      expect(plan.every((asset) => asset.license === "CC0")).toBe(true);
      expect(plan.every((asset) => asset.source.startsWith("https://"))).toBe(
        true,
      );
      expect(plan.every((asset) => asset.position.length === 3)).toBe(true);
    }
  });

  it("keeps a safe fallback for every pending UltraShape refinement", () => {
    expect(validateUltraShapeAssetManifest()).toEqual([]);
    const plannedIds = new Set(
      Object.values(studioEnvironmentAssetPlans)
        .flat()
        .map((asset) => asset.id),
    );
    expect(
      ultraShapeAssetManifest.every(
        (asset) => plannedIds.has(asset.id) && asset.status === "pending",
      ),
    ).toBe(true);
  });

  it("keeps placements bounded to the visible outdoor context", () => {
    const assets = Object.values(
      studioEnvironmentAssetPlans,
    ).flat() as readonly StudioEnvironmentAssetPlacement[];
    expect(
      assets.every(
        (asset) =>
          Math.abs(asset.position[0]) <= 4 &&
          Math.abs(asset.position[2]) <= 3 &&
          asset.scale > 0,
      ),
    ).toBe(true);
  });
});
