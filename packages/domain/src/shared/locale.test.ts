import { describe, expect, it } from "vitest";
import {
  createLocale,
  createLocalizedText,
  resolveLocalizedText,
} from "./locale.js";

describe("locale values", () => {
  it("canonicalizes BCP 47 tags and resolves a deterministic fallback", () => {
    const text = createLocalizedText({ en: "Roof", "fr-FR": "Toit" });

    expect(createLocale("fr-fr")).toBe("fr-FR");
    expect(
      resolveLocalizedText(text, createLocale("fr-CA"), createLocale("en")),
    ).toBe("Roof");
    expect(
      resolveLocalizedText(text, createLocale("fr-FR"), createLocale("en")),
    ).toBe("Toit");
  });

  it("rejects empty locales and empty localized maps", () => {
    expect(() => createLocale(" ")).toThrow("Locale is required");
    expect(() => createLocalizedText({})).toThrow("Localized text requires");
    expect(() => createLocalizedText({ en: "" })).toThrow(
      "Localized text values",
    );
  });
});
