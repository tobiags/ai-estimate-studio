import { describe, expect, it } from "vitest";
import {
  attachAccessory,
  canInsertWall,
  defaultStudioConfiguration,
  insertWall,
  moveWall,
  remainingWidthMm,
  removeWall,
  usedWidthMm,
} from "../index.js";

describe("Mobup studio configuration", () => {
  it("starts with the documented P4 facade and consumes exactly five metres", () => {
    expect(defaultStudioConfiguration.baseCode).toBe("P4");
    expect(usedWidthMm(defaultStudioConfiguration)).toBe(5000);
    expect(remainingWidthMm(defaultStudioConfiguration)).toBe(0);
    expect(defaultStudioConfiguration.accessories[0]?.code).toBe("CLAUSTRA");
  });

  it("rejects a wall when the remaining width is insufficient", () => {
    expect(canInsertWall(defaultStudioConfiguration, "M7")).toEqual({
      ok: false,
      reason: "WIDTH_EXCEEDED",
    });
    expect(insertWall(defaultStudioConfiguration, "M7")).toEqual({
      ok: false,
      reason: "WIDTH_EXCEEDED",
    });
  });

  it("keeps accessory placement independent from facade width", () => {
    const result = attachAccessory(defaultStudioConfiguration, "C1", "wall-1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(remainingWidthMm(result.configuration)).toBe(0);
    expect(result.configuration.accessories.at(-1)?.targetWallId).toBe(
      "wall-1",
    );
  });

  it("reorders walls without changing their widths and removes dependent accessories", () => {
    const moved = moveWall(defaultStudioConfiguration, "wall-1", 1);
    expect(moved.ok).toBe(true);
    if (!moved.ok) return;
    expect(moved.configuration.walls.map((wall) => wall.code)).toEqual([
      "M8",
      "M1",
    ]);

    const removed = removeWall(moved.configuration, "wall-2");
    expect(removed.ok).toBe(true);
    if (!removed.ok) return;
    expect(removed.configuration.walls.map((wall) => wall.code)).toEqual([
      "M1",
    ]);
    expect(removed.configuration.accessories).toHaveLength(0);
  });

  it("returns fresh frozen arrays for each mutation", () => {
    const result = insertWall(
      { ...defaultStudioConfiguration, walls: [] },
      "M1",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.configuration.walls).not.toBe(
      defaultStudioConfiguration.walls,
    );
    expect(Object.isFrozen(result.configuration.walls)).toBe(true);
    expect(Object.isFrozen(result.configuration)).toBe(true);
  });
});
