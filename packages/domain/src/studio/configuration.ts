import {
  defaultStudioCatalog,
  findStudioAccessory,
  findStudioBase,
  findStudioWall,
  type StudioAccessoryCode,
  type StudioBaseCode,
  type StudioCatalog,
  type StudioWallCode,
} from "./catalog.js";

export type WallInstance = Readonly<{
  id: string;
  code: StudioWallCode;
}>;

export type AccessoryInstance = Readonly<{
  id: string;
  code: StudioAccessoryCode;
  targetWallId: string;
}>;

export type StudioConfiguration = Readonly<{
  catalogVersion: string;
  baseCode: StudioBaseCode;
  walls: readonly WallInstance[];
  accessories: readonly AccessoryInstance[];
}>;

export type ConfigurationFailure =
  "WIDTH_EXCEEDED" | "UNKNOWN_MODULE" | "INVALID_TARGET";

export type MutationResult =
  | Readonly<{ ok: true; configuration: StudioConfiguration }>
  | Readonly<{ ok: false; reason: ConfigurationFailure }>;

const freezeConfiguration = (
  configuration: StudioConfiguration,
): StudioConfiguration =>
  Object.freeze({
    ...configuration,
    walls: Object.freeze(
      configuration.walls.map((wall) => Object.freeze({ ...wall })),
    ),
    accessories: Object.freeze(
      configuration.accessories.map((accessory) =>
        Object.freeze({ ...accessory }),
      ),
    ),
  });

export const defaultStudioConfiguration: StudioConfiguration =
  freezeConfiguration({
    catalogVersion: defaultStudioCatalog.version,
    baseCode: "P4",
    walls: Object.freeze([
      { id: "wall-1", code: "M1" },
      { id: "wall-2", code: "M8" },
    ]),
    accessories: Object.freeze([
      { id: "accessory-1", code: "CLAUSTRA", targetWallId: "wall-2" },
    ]),
  });

function nextWallId(configuration: StudioConfiguration): string {
  const used = new Set(configuration.walls.map((wall) => wall.id));
  let index = configuration.walls.length + 1;
  while (used.has(`wall-${index}`)) index += 1;
  return `wall-${index}`;
}

function nextAccessoryId(configuration: StudioConfiguration): string {
  const used = new Set(configuration.accessories.map((item) => item.id));
  let index = configuration.accessories.length + 1;
  while (used.has(`accessory-${index}`)) index += 1;
  return `accessory-${index}`;
}

export function usedWidthMm(
  configuration: StudioConfiguration,
  catalog: StudioCatalog = defaultStudioCatalog,
): number {
  return configuration.walls.reduce((total, item) => {
    const wall = findStudioWall(catalog, item.code);
    return total + (wall?.widthMm ?? 0);
  }, 0);
}

export function remainingWidthMm(
  configuration: StudioConfiguration,
  catalog: StudioCatalog = defaultStudioCatalog,
): number {
  const base = findStudioBase(catalog, configuration.baseCode);
  return (base?.widthMm ?? 0) - usedWidthMm(configuration, catalog);
}

export function canInsertWall(
  configuration: StudioConfiguration,
  wallCode: string,
  catalog: StudioCatalog = defaultStudioCatalog,
): Readonly<{ ok: true } | { ok: false; reason: ConfigurationFailure }> {
  const wall = findStudioWall(catalog, wallCode as StudioWallCode);
  if (!wall) return { ok: false, reason: "UNKNOWN_MODULE" };
  if (wall.widthMm > remainingWidthMm(configuration, catalog)) {
    return { ok: false, reason: "WIDTH_EXCEEDED" };
  }
  return { ok: true };
}

export function insertWall(
  configuration: StudioConfiguration,
  wallCode: string,
  index = configuration.walls.length,
  catalog: StudioCatalog = defaultStudioCatalog,
): MutationResult {
  const check = canInsertWall(configuration, wallCode, catalog);
  if (!check.ok) return check;
  const boundedIndex = Math.max(0, Math.min(index, configuration.walls.length));
  const walls = [...configuration.walls];
  walls.splice(boundedIndex, 0, {
    id: nextWallId(configuration),
    code: wallCode as StudioWallCode,
  });
  return {
    ok: true,
    configuration: freezeConfiguration({ ...configuration, walls }),
  };
}

export function moveWall(
  configuration: StudioConfiguration,
  wallId: string,
  index: number,
): MutationResult {
  const currentIndex = configuration.walls.findIndex(
    (wall) => wall.id === wallId,
  );
  if (currentIndex < 0) return { ok: false, reason: "INVALID_TARGET" };
  const walls = [...configuration.walls];
  const [wall] = walls.splice(currentIndex, 1);
  walls.splice(Math.max(0, Math.min(index, walls.length)), 0, wall!);
  return {
    ok: true,
    configuration: freezeConfiguration({ ...configuration, walls }),
  };
}

export function removeWall(
  configuration: StudioConfiguration,
  wallId: string,
): MutationResult {
  if (!configuration.walls.some((wall) => wall.id === wallId)) {
    return { ok: false, reason: "INVALID_TARGET" };
  }
  return {
    ok: true,
    configuration: freezeConfiguration({
      ...configuration,
      walls: configuration.walls.filter((wall) => wall.id !== wallId),
      accessories: configuration.accessories.filter(
        (accessory) => accessory.targetWallId !== wallId,
      ),
    }),
  };
}

export function attachAccessory(
  configuration: StudioConfiguration,
  accessoryCode: string,
  targetWallId: string,
  catalog: StudioCatalog = defaultStudioCatalog,
): MutationResult {
  const accessory = findStudioAccessory(
    catalog,
    accessoryCode as StudioAccessoryCode,
  );
  if (!accessory) return { ok: false, reason: "UNKNOWN_MODULE" };
  if (!configuration.walls.some((wall) => wall.id === targetWallId)) {
    return { ok: false, reason: "INVALID_TARGET" };
  }
  return {
    ok: true,
    configuration: freezeConfiguration({
      ...configuration,
      accessories: [
        ...configuration.accessories,
        {
          id: nextAccessoryId(configuration),
          code: accessory.code,
          targetWallId,
        },
      ],
    }),
  };
}

export function removeAccessory(
  configuration: StudioConfiguration,
  accessoryId: string,
): MutationResult {
  if (!configuration.accessories.some((item) => item.id === accessoryId)) {
    return { ok: false, reason: "INVALID_TARGET" };
  }
  return {
    ok: true,
    configuration: freezeConfiguration({
      ...configuration,
      accessories: configuration.accessories.filter(
        (item) => item.id !== accessoryId,
      ),
    }),
  };
}
