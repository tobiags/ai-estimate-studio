import { describe, expect, it } from "vitest";
import { defaultStudioConfiguration } from "./catalog";
import { defaultStudioEnvironment } from "./environments";
import {
  loadStudioState,
  saveStudioState,
  studioStorageKey,
  type StudioStorage,
} from "./persistence";

function memoryStorage(initial: string | null = null) {
  let value = initial;
  let savedKey = "";
  const storage: StudioStorage = {
    getItem: () => value,
    setItem: (_key, next) => {
      savedKey = _key;
      value = next;
    },
  };
  return { storage, read: () => value, savedKey: () => savedKey };
}

describe("Mobup local persistence", () => {
  it("round trips configuration, language and environment", () => {
    const memory = memoryStorage();
    saveStudioState(memory.storage, {
      catalogVersion: defaultStudioConfiguration.catalogVersion,
      language: "fr",
      environment: "pool",
      configuration: defaultStudioConfiguration,
    });
    const loaded = loadStudioState(memory.storage);
    expect(loaded.language).toBe("fr");
    expect(loaded.environment).toBe("pool");
    expect(loaded.configuration.walls.map((wall) => wall.code)).toEqual([
      "M1",
      "M8",
    ]);
    expect(memory.savedKey()).toBe(studioStorageKey);
  });

  it("keeps older payloads in the garden context", () => {
    const legacy = memoryStorage(
      JSON.stringify({
        catalogVersion: defaultStudioConfiguration.catalogVersion,
        language: "en",
        baseCode: "P4",
        walls: [],
        accessories: [],
      }),
    );
    expect(loadStudioState(legacy.storage).environment).toBe(
      defaultStudioEnvironment,
    );
  });

  it("falls back safely for malformed, stale or oversized payloads", () => {
    const malformed = memoryStorage("{not-json");
    expect(loadStudioState(malformed.storage).configuration).toEqual(
      defaultStudioConfiguration,
    );

    const stale = memoryStorage(
      JSON.stringify({
        catalogVersion: "old",
        language: "fr",
        baseCode: "P4",
        walls: [],
        accessories: [],
      }),
    );
    expect(loadStudioState(stale.storage).language).toBe("en");

    const oversized = memoryStorage("x".repeat(12_001));
    expect(loadStudioState(oversized.storage).configuration).toEqual(
      defaultStudioConfiguration,
    );
  });

  it("does not throw when browser storage is unavailable", () => {
    const broken: StudioStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(() => loadStudioState(broken)).not.toThrow();
    expect(loadStudioState(broken).configuration).toEqual(
      defaultStudioConfiguration,
    );
    expect(() =>
      saveStudioState(broken, {
        catalogVersion: defaultStudioConfiguration.catalogVersion,
        language: "en",
        environment: defaultStudioEnvironment,
        configuration: defaultStudioConfiguration,
      }),
    ).not.toThrow();
  });
});
