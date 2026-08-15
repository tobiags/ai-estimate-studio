import { describe, expect, it } from "vitest";
import {
  studioTerrainHeight,
  studioTerrainProfiles,
  studioTerrainSampleGrid,
} from "./studio-terrain";

describe("studio terrain profiles", () => {
  it("keeps a stable seeded sample for each exterior", () => {
    for (const environment of ["garden", "pool", "terrace"] as const) {
      const profile = studioTerrainProfiles[environment];
      const expectedSamples =
        (profile.subdivisions[0] + 1) * (profile.subdivisions[1] + 1);
      const first = studioTerrainSampleGrid(environment);
      const second = studioTerrainSampleGrid(environment);

      expect(first).toHaveLength(expectedSamples);
      expect(first).toEqual(second);
      expect(first.every((height) => Number.isFinite(height))).toBe(true);
    }
  });

  it("keeps the studio footprint close to level while shaping the perimeter", () => {
    const center = studioTerrainHeight("garden", 0, 0);
    const perimeter = studioTerrainHeight("garden", 4.7, 3.4);

    expect(Math.abs(center + 0.032)).toBeLessThan(0.05);
    expect(Math.abs(perimeter - center)).toBeGreaterThan(0.015);
  });
});
