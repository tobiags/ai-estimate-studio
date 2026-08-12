import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { defaultStudioConfiguration, studioCatalog } from "../studio/catalog";
import { createMobupStudioModel } from "./studio-model";

describe("Mobup studio model", () => {
  it("builds the approved default dimensions and named groups", () => {
    const model = createMobupStudioModel(
      defaultStudioConfiguration,
      studioCatalog,
    );
    expect(model.userData.mobup).toMatchObject({
      baseCode: "P4",
      widthMm: 5000,
      depthMm: 3000,
      heightMm: 2800,
      usedWidthMm: 5000,
    });
    expect(model.getObjectByName("foundation")).toBeDefined();
    expect(model.getObjectByName("roof")).toBeDefined();
    expect(model.getObjectByName("walls")).toBeDefined();
    expect(model.getObjectByName("wall-wall-1-M1")).toBeDefined();
    expect(model.getObjectByName("wall-wall-2-M8")).toBeDefined();
    expect(
      model.getObjectByName("accessory-accessory-1-CLAUSTRA"),
    ).toBeDefined();
  });

  it("keeps P2 wall meshes inside the selected base bounds", () => {
    const configuration = {
      ...defaultStudioConfiguration,
      baseCode: "P2" as const,
      walls: [{ id: "wall-1", code: "M1" as const }],
      accessories: [],
    };
    const model = createMobupStudioModel(configuration, studioCatalog);
    const wall = model.getObjectByName("wall-wall-1-M1");
    const foundation = model.getObjectByName("foundation");
    expect(wall).toBeDefined();
    expect(foundation).toBeDefined();
    const wallBounds = new THREE.Box3().setFromObject(wall!);
    const baseBounds = new THREE.Box3().setFromObject(foundation!);
    expect(wallBounds.min.x).toBeGreaterThanOrEqual(baseBounds.min.x - 0.001);
    expect(wallBounds.max.x).toBeLessThanOrEqual(baseBounds.max.x + 0.001);
  });

  it("keeps analysis hidden until the viewer requests it", () => {
    const model = createMobupStudioModel(
      defaultStudioConfiguration,
      studioCatalog,
    );
    expect(model.getObjectByName("analysis")?.visible).toBe(false);
    expect(model.getObjectByName("analysis")?.userData.dimensions).toEqual({
      widthMm: 5000,
      depthMm: 3000,
      heightMm: 2800,
    });
  });
});
