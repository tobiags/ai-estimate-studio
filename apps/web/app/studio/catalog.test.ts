import { describe, expect, it } from "vitest";
import {
  defaultStudioConfiguration,
  studioCatalog,
  studioCatalogVersion,
  studioLabel,
} from "./catalog";

describe("Mobup public catalog", () => {
  it("contains every documented base, wall and accessory", () => {
    expect(studioCatalog.bases.map((item) => item.code)).toEqual([
      "P1",
      "P2",
      "P3",
      "P4",
    ]);
    expect(studioCatalog.walls.map((item) => item.code)).toEqual([
      "M1",
      "M2",
      "M3",
      "M4",
      "M5",
      "M6",
      "M7",
      "M8",
      "M9",
      "M10",
    ]);
    expect(studioCatalog.accessories.map((item) => item.code)).toEqual([
      "C1",
      "CLAUSTRA",
    ]);
    expect(
      studioCatalog.bases.find((item) => item.code === "P4")?.widthMm,
    ).toBe(5000);
    expect(
      studioCatalog.walls.find((item) => item.code === "M8")?.widthMm,
    ).toBe(3750);
  });

  it("uses the approved default composition and complete bilingual labels", () => {
    expect(defaultStudioConfiguration.walls.map((wall) => wall.code)).toEqual([
      "M1",
      "M8",
    ]);
    expect(
      studioCatalog.bases.every(
        (item) => studioLabel(item.code, "en") && studioLabel(item.code, "fr"),
      ),
    ).toBe(true);
    expect(
      studioCatalog.walls.every(
        (item) => studioLabel(item.code, "en") && studioLabel(item.code, "fr"),
      ),
    ).toBe(true);
    expect(
      studioCatalog.accessories.every(
        (item) => studioLabel(item.code, "en") && studioLabel(item.code, "fr"),
      ),
    ).toBe(true);
    expect(studioCatalogVersion).toMatch(/^mobup-demo-/);
  });
});
