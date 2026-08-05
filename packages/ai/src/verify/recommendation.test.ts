import { describe, expect, it } from "vitest";
import { verifyRecommendation } from "./recommendation.js";

const entities = [
  {
    entityType: "OPTION" as const,
    entityId: "option-basic",
    revisionId: "revision-a",
    label: "Basic",
    deltaMinor: "0",
  },
  {
    entityType: "OPTION" as const,
    entityId: "option-premium",
    revisionId: "revision-a",
    label: "Premium",
    deltaMinor: "300",
  },
  {
    entityType: "VARIANT" as const,
    entityId: "variant-a",
    revisionId: "revision-a",
    label: "Variant A",
  },
];

describe("recommendation verification", () => {
  it("keeps only suggestions whose IDs, citations and deltas are authoritative", async () => {
    const result = await verifyRecommendation(
      {
        summary: "Options",
        suggestions: [
          {
            kind: "PREMIUM_UPGRADE",
            title: "Premium",
            rationale: "More capability",
            addOptionIds: ["option-premium"],
            removeOptionIds: [],
            verifiedDeltaMinor: "300",
            currency: "EUR",
            citations: [{ entityType: "OPTION", entityId: "option-premium" }],
          },
          {
            kind: "EXPLANATION",
            title: "Invented",
            rationale: "Not in catalog",
            addOptionIds: ["option-invented"],
            removeOptionIds: [],
            verifiedDeltaMinor: "1",
            currency: "EUR",
            citations: [{ entityType: "OPTION", entityId: "option-invented" }],
          },
          {
            kind: "CHEAPER_ALTERNATIVE",
            title: "Wrong delta",
            rationale: "Mismatch",
            addOptionIds: ["option-basic"],
            removeOptionIds: [],
            verifiedDeltaMinor: "999",
            currency: "EUR",
            citations: [{ entityType: "VARIANT", entityId: "variant-a" }],
          },
        ],
        warnings: [],
      },
      entities,
      async ({ addOptionIds }) =>
        addOptionIds.includes("option-premium")
          ? { valid: true, deltaMinor: "300", currency: "EUR" }
          : { valid: true, deltaMinor: "0", currency: "EUR" },
    );

    expect(result.status).toBe("PARTIAL");
    expect(result.output.suggestions.map((item) => item.title)).toEqual([
      "Premium",
    ]);
    expect(result.issues.map((item) => item.code)).toEqual([
      "UNKNOWN_ENTITY",
      "DELTA_MISMATCH",
    ]);
  });

  it("rejects overlapping option changes and invalid configurations", async () => {
    const result = await verifyRecommendation(
      {
        summary: "Invalid",
        suggestions: [
          {
            kind: "EXPLANATION",
            title: "Overlap",
            rationale: "Invalid",
            addOptionIds: ["option-basic"],
            removeOptionIds: ["option-basic"],
            verifiedDeltaMinor: "0",
            currency: "EUR",
            citations: [],
          },
          {
            kind: "EXPLANATION",
            title: "Rejected",
            rationale: "Invalid configuration",
            addOptionIds: ["option-premium"],
            removeOptionIds: [],
            verifiedDeltaMinor: "300",
            currency: "EUR",
            citations: [],
          },
        ],
        warnings: [],
      },
      entities,
      async () => ({ valid: false, deltaMinor: "0", currency: "EUR" }),
    );

    expect(result.status).toBe("REJECTED");
    expect(result.output.suggestions).toHaveLength(0);
    expect(result.issues.map((item) => item.code)).toEqual([
      "INVALID_COMBINATION",
      "INVALID_COMBINATION",
    ]);
  });
});
