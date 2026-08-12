import { describe, expect, it } from "vitest";
import {
  defaultStudioEnvironment,
  isStudioEnvironmentCode,
  studioEnvironments,
  studioEnvironmentLabel,
} from "./environments";

describe("Mobup studio environments", () => {
  it("exposes the public visual contexts in both languages", () => {
    expect(defaultStudioEnvironment).toBe("garden");
    expect(studioEnvironments.map((item) => item.code)).toEqual([
      "garden",
      "pool",
      "terrace",
    ]);
    expect(studioEnvironmentLabel("pool", "fr")).toBe("Bord de piscine");
  });

  it("rejects unknown persisted environment values", () => {
    expect(isStudioEnvironmentCode("garden")).toBe(true);
    expect(isStudioEnvironmentCode("pergola")).toBe(false);
  });
});
