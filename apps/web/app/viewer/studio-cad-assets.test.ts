import { describe, expect, it } from "vitest";
import {
  defaultStudioConfiguration,
  type StudioConfiguration,
} from "@ai-estimate-studio/domain";
import {
  resolveStudioCadAsset,
  studioCadAssetPlans,
} from "./studio-cad-assets";

describe("studio CAD asset resolver", () => {
  it("maps the default P4 facade to the generated asset", () => {
    expect(resolveStudioCadAsset(defaultStudioConfiguration)?.id).toBe(
      "p4-m1-m8",
    );
  });

  it("only resolves exact ordered wall configurations", () => {
    const reversed: StudioConfiguration = {
      ...defaultStudioConfiguration,
      walls: [
        { id: "wall-1", code: "M8" },
        { id: "wall-2", code: "M1" },
      ],
    };
    expect(resolveStudioCadAsset(reversed)).toBeUndefined();
  });

  it("keeps a supported single-module variant available", () => {
    const p3: StudioConfiguration = {
      ...defaultStudioConfiguration,
      baseCode: "P3",
      walls: [{ id: "wall-1", code: "M8" }],
      accessories: [],
    };
    expect(resolveStudioCadAsset(p3)?.path).toBe(
      "/assets/models/studio/mobup-studio-p3-m8.glb",
    );
  });

  it("keeps the asset table immutable", () => {
    expect(Object.isFrozen(studioCadAssetPlans)).toBe(true);
  });
});
