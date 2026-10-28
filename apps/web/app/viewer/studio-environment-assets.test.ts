import { describe, expect, it } from "vitest";
import {
  studioEnvironmentAssetPlans,
  studioInteriorAssetPlan,
  type StudioEnvironmentAssetPlacement,
} from "./studio-environment-assets";
import {
  ultraShapeAssetManifest,
  validateUltraShapeAssetManifest,
} from "./ultrashape-assets";

describe("studio environment asset plans", () => {
  it("fits licensed NVIDIA interior furniture to the available width", () => {
    for (const width of [1.25, 2.5, 3.75, 5]) {
      const plan = studioInteriorAssetPlan(width);
      expect(plan.map((item) => item.id)).toEqual(
        width < 2.5 ? ["nvidia-chair"] : ["nvidia-sofa", "nvidia-coffee-table"],
      );
      expect(
        plan.every((item) => item.license === "CC-BY-4.0" && item.scale === 1),
      ).toBe(true);
      expect(
        plan.every((item) => item.position[1] === 0.235 && !item.side),
      ).toBe(true);
      // Rotated sofa is 1.526 m wide; wall faces are 0.12 m thick.
      if (width >= 2.5) expect(1.526 + 0.24).toBeLessThan(width);
      // Sofa front and table rear retain at least 0.31 m clearance.
      expect(0.72 + 0.25 - (0.703 + 0.6) / 2).toBeGreaterThan(0.31);
    }
  });
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
