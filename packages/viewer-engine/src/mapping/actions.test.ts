import { describe, expect, it, vi } from "vitest";
import { MappingController, detectMappingConflicts } from "./actions";

describe("generic mapping controller", () => {
  it("applies visibility/material changes idempotently", () => {
    const target = {
      setVisibility: vi.fn(),
      setMaterial: vi.fn(),
      focusNode: vi.fn(),
      playAnimation: vi.fn(),
    };
    const controller = new MappingController(target);
    const actions = [
      { type: "SET_VISIBILITY" as const, nodeId: "body", visible: false },
      { type: "SET_MATERIAL" as const, nodeId: "body", materialKey: "blue" },
    ];
    controller.apply(actions);
    controller.apply(actions);
    expect(target.setVisibility).toHaveBeenCalledOnce();
    expect(target.setMaterial).toHaveBeenCalledOnce();
    expect(controller.state()).toEqual({
      visibility: { body: false },
      materials: { body: "blue" },
    });
  });

  it("reports duplicate property writes from different action sources", () => {
    expect(
      detectMappingConflicts([
        { type: "SET_VISIBILITY", nodeId: "body", visible: true },
        { type: "SET_MATERIAL", nodeId: "body", materialKey: "blue" },
      ]),
    ).toEqual([]);
    expect(
      detectMappingConflicts([
        { type: "SET_VISIBILITY", nodeId: "body", visible: true },
        { type: "SET_VISIBILITY", nodeId: "body", visible: false },
      ]),
    ).toMatchObject([{ nodeId: "body", property: "visibility" }]);
  });
});
