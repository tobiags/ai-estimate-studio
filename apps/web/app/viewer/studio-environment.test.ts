import { describe, expect, it } from "vitest";
import {
  createMobupEnvironmentScene,
  disposeMobupEnvironment,
} from "./studio-environment";

describe("Mobup environment scenes", () => {
  it("builds distinct context groups for garden, pool and terrace", () => {
    for (const code of ["garden", "pool", "terrace"] as const) {
      const scene = createMobupEnvironmentScene(code);
      expect(scene.name).toBe(`mobup-environment-${code}`);
      expect(scene.userData.environment).toBe(code);
      expect(scene.children.length).toBeGreaterThan(0);
      disposeMobupEnvironment(scene);
    }
  });

  it("includes a water surface in the pool context", () => {
    const scene = createMobupEnvironmentScene("pool");
    expect(scene.getObjectByName("pool-water")).toBeDefined();
    disposeMobupEnvironment(scene);
  });
});
