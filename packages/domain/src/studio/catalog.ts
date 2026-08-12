export const studioBaseCodes = ["P1", "P2", "P3", "P4"] as const;
export type StudioBaseCode = (typeof studioBaseCodes)[number];

export const studioWallCodes = [
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
] as const;
export type StudioWallCode = (typeof studioWallCodes)[number];

export const studioAccessoryCodes = ["C1", "CLAUSTRA"] as const;
export type StudioAccessoryCode = (typeof studioAccessoryCodes)[number];

export type StudioWallKind = "SOLID" | "OPENING" | "GLAZED";

export type StudioBase = Readonly<{
  code: StudioBaseCode;
  widthMm: number;
  depthMm: number;
  heightMm: number;
  priceMinor: number;
}>;

export type StudioWall = Readonly<{
  code: StudioWallCode;
  widthMm: number;
  heightMm: number;
  kind: StudioWallKind;
  innerOpeningWidthMm?: number;
  innerOpeningHeightMm?: number;
  priceMinor: number;
}>;

export type StudioAccessory = Readonly<{
  code: StudioAccessoryCode;
  visualWidthMm: number;
  priceMinor: number;
  consumesWidthMm: 0;
}>;

export type StudioCatalog = Readonly<{
  version: string;
  bases: readonly StudioBase[];
  walls: readonly StudioWall[];
  accessories: readonly StudioAccessory[];
}>;

const base = (
  code: StudioBaseCode,
  widthMm: number,
  priceMinor: number,
): StudioBase => ({
  code,
  widthMm,
  depthMm: 3000,
  heightMm: 2800,
  priceMinor,
});

const wall = (
  code: StudioWallCode,
  widthMm: number,
  kind: StudioWallKind,
  priceMinor: number,
  opening?: Pick<StudioWall, "innerOpeningWidthMm" | "innerOpeningHeightMm">,
): StudioWall => ({
  code,
  widthMm,
  heightMm: 2800,
  kind,
  priceMinor,
  ...opening,
});

const accessory = (
  code: StudioAccessoryCode,
  visualWidthMm: number,
  priceMinor: number,
): StudioAccessory => ({
  code,
  visualWidthMm,
  priceMinor,
  consumesWidthMm: 0,
});

export const defaultStudioCatalog: StudioCatalog = Object.freeze({
  version: "mobup-demo-2026-08-12",
  bases: Object.freeze([
    base("P1", 1250, 115000),
    base("P2", 2500, 189000),
    base("P3", 3750, 259000),
    base("P4", 5000, 329000),
  ]),
  walls: Object.freeze([
    wall("M1", 1250, "SOLID", 69000),
    wall("M2", 500, "OPENING", 39000, {
      innerOpeningWidthMm: 0,
      innerOpeningHeightMm: 900,
    }),
    wall("M3", 700, "OPENING", 52000, {
      innerOpeningWidthMm: 0,
      innerOpeningHeightMm: 2000,
    }),
    wall("M4", 900, "OPENING", 59000, {
      innerOpeningWidthMm: 0,
      innerOpeningHeightMm: 2200,
    }),
    wall("M5", 900, "OPENING", 59000, {
      innerOpeningWidthMm: 0,
      innerOpeningHeightMm: 2200,
    }),
    wall("M6", 900, "OPENING", 59000, {
      innerOpeningWidthMm: 0,
      innerOpeningHeightMm: 900,
    }),
    wall("M7", 2500, "GLAZED", 179000, {
      innerOpeningWidthMm: 2140,
      innerOpeningHeightMm: 2200,
    }),
    wall("M8", 3750, "GLAZED", 249000, {
      innerOpeningWidthMm: 3400,
      innerOpeningHeightMm: 2200,
    }),
    wall("M9", 2500, "OPENING", 179000, {
      innerOpeningWidthMm: 2160,
      innerOpeningHeightMm: 2200,
    }),
    wall("M10", 3750, "SOLID", 199000, {
      innerOpeningWidthMm: 3400,
      innerOpeningHeightMm: 2200,
    }),
  ]),
  accessories: Object.freeze([
    accessory("C1", 800, 39000),
    accessory("CLAUSTRA", 1250, 49000),
  ]),
});

export function findStudioBase(
  catalog: StudioCatalog,
  code: StudioBaseCode,
): StudioBase | undefined {
  return catalog.bases.find((item) => item.code === code);
}

export function findStudioWall(
  catalog: StudioCatalog,
  code: StudioWallCode,
): StudioWall | undefined {
  return catalog.walls.find((item) => item.code === code);
}

export function findStudioAccessory(
  catalog: StudioCatalog,
  code: StudioAccessoryCode,
): StudioAccessory | undefined {
  return catalog.accessories.find((item) => item.code === code);
}
