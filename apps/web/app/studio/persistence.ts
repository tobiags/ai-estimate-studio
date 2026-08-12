import {
  defaultStudioConfiguration,
  isStudioAccessoryCode,
  isStudioBaseCode,
  isStudioWallCode,
  rebuildStudioConfiguration,
  studioCatalogVersion,
  type StudioAccessoryCode,
  type StudioBaseCode,
  type StudioLanguage,
  type StudioWallCode,
} from "./catalog";
import type { StudioConfiguration } from "@ai-estimate-studio/domain";

export const studioStorageKey = "mobup-studio-configuration-v1";
const maximumStoragePayloadLength = 12_000;

export type StudioStorage = Readonly<{
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}>;

export type PersistedStudioState = Readonly<{
  catalogVersion: string;
  language: StudioLanguage;
  configuration: StudioConfiguration;
}>;

type PersistedPayload = Readonly<{
  catalogVersion: string;
  language: StudioLanguage;
  baseCode: StudioBaseCode;
  walls: readonly Readonly<{ id: string; code: StudioWallCode }>[];
  accessories: readonly Readonly<{
    id: string;
    code: StudioAccessoryCode;
    targetWallId: string;
  }>[];
}>;

const defaultState = (): PersistedStudioState => ({
  catalogVersion: studioCatalogVersion,
  language: "en",
  configuration: defaultStudioConfiguration,
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parsePayload(value: string | null): PersistedPayload | undefined {
  if (!value || value.length > maximumStoragePayloadLength) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed)) return undefined;
    if (
      parsed.catalogVersion !== studioCatalogVersion ||
      (parsed.language !== "en" && parsed.language !== "fr") ||
      typeof parsed.baseCode !== "string" ||
      !Array.isArray(parsed.walls) ||
      !Array.isArray(parsed.accessories)
    ) {
      return undefined;
    }
    if (!isStudioBaseCode(parsed.baseCode)) return undefined;
    const baseCode = parsed.baseCode;
    const walls = parsed.walls.filter(isRecord).map((wall) => ({
      id: typeof wall.id === "string" ? wall.id : "",
      code: typeof wall.code === "string" ? wall.code : "",
    }));
    const accessories = parsed.accessories.filter(isRecord).map((item) => ({
      id: typeof item.id === "string" ? item.id : "",
      code: typeof item.code === "string" ? item.code : "",
      targetWallId:
        typeof item.targetWallId === "string" ? item.targetWallId : "",
    }));
    if (
      walls.some(
        (wall) => wall.id.length === 0 || !isStudioWallCode(wall.code),
      ) ||
      accessories.some(
        (item) =>
          item.id.length === 0 ||
          !isStudioAccessoryCode(item.code) ||
          item.targetWallId.length === 0,
      )
    ) {
      return undefined;
    }
    return {
      catalogVersion: studioCatalogVersion,
      language: parsed.language,
      baseCode,
      walls: walls as PersistedPayload["walls"],
      accessories: accessories as PersistedPayload["accessories"],
    };
  } catch {
    return undefined;
  }
}

export function loadStudioState(
  storage: StudioStorage | undefined,
): PersistedStudioState {
  if (!storage) return defaultState();
  let rawValue: string | null = null;
  try {
    rawValue = storage.getItem(studioStorageKey);
  } catch {
    return defaultState();
  }
  const payload = parsePayload(rawValue);
  if (!payload) return defaultState();
  const configuration = rebuildStudioConfiguration(
    payload.baseCode,
    payload.walls,
    payload.accessories,
  );
  if (!configuration) return defaultState();
  return Object.freeze({
    catalogVersion: studioCatalogVersion,
    language: payload.language,
    configuration,
  });
}

export function saveStudioState(
  storage: StudioStorage | undefined,
  state: PersistedStudioState,
): void {
  if (!storage) return;
  const payload: PersistedPayload = {
    catalogVersion: studioCatalogVersion,
    language: state.language,
    baseCode: state.configuration.baseCode,
    walls: state.configuration.walls,
    accessories: state.configuration.accessories,
  };
  try {
    storage.setItem(studioStorageKey, JSON.stringify(payload));
  } catch {
    // Private browsing and full storage are non-fatal for a public demo.
  }
}
