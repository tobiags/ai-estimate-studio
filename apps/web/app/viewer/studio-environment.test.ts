import { describe, expect, it } from "vitest";
import {
  createMobupEnvironmentScene,
  disposeMobupEnvironment,
} from "./studio-environment";
import { studioPoolLayout } from "./studio-layout";

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
    const scene = createMobupEnvironmentScene("pool", {}, 5);
    const water = scene.getObjectByName("pool-water");
    const layout = studioPoolLayout(5);
    expect(water).toBeDefined();
    if (!water) throw new Error("pool-water was not created");
    expect(water.position.x).toBe(layout.x);
    expect(water.position.x - layout.waterWidth / 2).toBeGreaterThan(2.5);
    disposeMobupEnvironment(scene);
  });
});
