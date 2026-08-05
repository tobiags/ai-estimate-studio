import { describe, expect, it } from "vitest";
import { HotspotInteraction } from "./interaction";

describe("HotspotInteraction", () => {
  it("picks nearest visible hotspot and supports keyboard order", () => {
    const interaction = new HotspotInteraction();
    interaction.setHotspots([
      { id: "a", label: "A", screen: { x: 10, y: 10 }, visible: true },
      { id: "b", label: "B", screen: { x: 100, y: 100 }, visible: true },
      { id: "hidden", label: "Hidden", screen: { x: 10, y: 10 }, visible: false },
    ]);
    expect(interaction.pick({ x: 12, y: 12 })?.id).toBe("a");
    expect(interaction.moveFocus("next")?.id).toBe("b");
    expect(interaction.moveFocus("next")?.id).toBe("a");
    expect(interaction.moveFocus("previous")?.id).toBe("b");
  });
});
