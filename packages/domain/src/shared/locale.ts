import { DomainValidationError } from "./errors.js";
import type { Brand } from "./ids.js";

export type Locale = Brand<string, "Locale">;
export type LocalizedText = Readonly<Record<string, string>>;

export function createLocale(value: unknown): Locale {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new DomainValidationError("Locale is required");
  }
  try {
    return new Intl.Locale(value).toString() as Locale;
  } catch {
    throw new DomainValidationError("Locale is invalid", { value });
  }
}

export function createLocalizedText(
  value: Record<string, string>,
): LocalizedText {
  const entries = Object.entries(value).map(([locale, text]) => {
    const canonicalLocale = createLocale(locale);
    if (typeof text !== "string" || text.trim().length === 0) {
      throw new DomainValidationError(
        "Localized text values must be non-empty",
        {
          locale: canonicalLocale,
        },
      );
    }
    return [canonicalLocale, text] as const;
  });
  if (entries.length === 0) {
    throw new DomainValidationError(
      "Localized text requires at least one locale",
    );
  }
  return Object.freeze(Object.fromEntries(entries));
}

function language(locale: Locale): string {
  return (locale.split("-")[0] ?? locale).toLowerCase();
}

export function resolveLocalizedText(
  value: LocalizedText,
  requested: Locale,
  fallback: Locale,
): string {
  const requestedLanguage = language(requested);
  const fallbackLanguage = language(fallback);
  const candidate =
    value[requested] ??
    Object.entries(value).find(
      ([locale]) => locale.toLowerCase() === requestedLanguage,
    )?.[1] ??
    value[fallback] ??
    Object.entries(value).find(
      ([locale]) => locale.toLowerCase() === fallbackLanguage,
    )?.[1] ??
    Object.entries(value).sort(([left], [right]) =>
      left.localeCompare(right),
    )[0]?.[1];
  if (!candidate)
    throw new DomainValidationError("Localized text has no resolvable value");
  return candidate;
}
