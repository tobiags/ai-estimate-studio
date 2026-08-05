import { describe, expect, it } from "vitest";

import { applySyntheticSeed, syntheticSeedRecords } from "./synthetic.js";

describe("synthetic seed", () => {
  it("is deterministic and idempotent", () => {
    const firstApplication = applySyntheticSeed([]);
    const secondApplication = applySyntheticSeed(firstApplication);

    expect(secondApplication).toEqual(firstApplication);
    expect(firstApplication).toEqual(syntheticSeedRecords);
    expect(new Set(firstApplication.map(({ id }) => id)).size).toBe(
      firstApplication.length,
    );
  });

  it("contains only explicitly synthetic records", () => {
    expect(syntheticSeedRecords.length).toBeGreaterThan(0);
    expect(syntheticSeedRecords.every(({ synthetic }) => synthetic)).toBe(true);
  });
});
