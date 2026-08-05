import { PricingError } from "./errors.js";

export type PricingFacts = Readonly<{
  variantId?: string;
  optionIds: readonly string[];
  dimensions: Readonly<Record<string, string>>;
  delivery?: Readonly<{ countryCode?: string; zoneCode?: string }>;
  locale?: string;
  evaluationTimestamp: string;
}>;

export type FactPath =
  | "variantId"
  | "locale"
  | "evaluationTimestamp"
  | `option.${string}`
  | `dimensions.${string}`
  | "delivery.countryCode"
  | "delivery.zoneCode";

export function readFact(
  facts: PricingFacts,
  path: FactPath,
): string | undefined {
  if (path === "variantId") return facts.variantId;
  if (path === "locale") return facts.locale;
  if (path === "evaluationTimestamp") return facts.evaluationTimestamp;
  if (path.startsWith("option.")) {
    return hasOption(facts, path.slice("option.".length)) ? "true" : undefined;
  }
  if (path === "delivery.countryCode") return facts.delivery?.countryCode;
  if (path === "delivery.zoneCode") return facts.delivery?.zoneCode;
  if (path.startsWith("dimensions.")) {
    const key = path.slice("dimensions.".length);
    if (!/^[A-Za-z0-9_.-]+$/.test(key)) {
      throw new PricingError(
        "UNKNOWN_FACT",
        `Fact path is not allowlisted: ${path}`,
      );
    }
    return Object.hasOwn(facts.dimensions, key)
      ? facts.dimensions[key]
      : undefined;
  }
  throw new PricingError(
    "UNKNOWN_FACT",
    `Fact path is not allowlisted: ${path}`,
  );
}

export function hasOption(facts: PricingFacts, optionId: string): boolean {
  return facts.optionIds.includes(optionId);
}
