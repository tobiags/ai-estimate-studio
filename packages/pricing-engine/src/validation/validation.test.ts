import { describe, expect, it } from "vitest";
import {
  validatePricingConfiguration,
  type PricingValidationInput,
} from "./index";

const rule = {
  id: "00000000-0000-4000-8000-000000000010",
  code: "BASE_PRICE",
  kind: "BASE" as const,
  priority: 1,
  label: "Base",
  condition: { exists: { fact: "variantId" } },
  action: {
    type: "ADD_LINE" as const,
    code: "BASE",
    kind: "BASE" as const,
    label: "Base",
    amountMinor: "100",
  },
};

function input(
  overrides: Partial<PricingValidationInput> = {},
): PricingValidationInput {
  return {
    revisionId: "revision-a",
    groups: [
      {
        id: "group-a",
        revisionId: "revision-a",
        selectionMode: "MULTIPLE",
        minSelections: 1,
        maxSelections: 2,
        required: true,
        optionIds: ["option-a", "option-b"],
      },
    ],
    options: [
      { id: "option-a", revisionId: "revision-a", groupId: "group-a" },
      { id: "option-b", revisionId: "revision-a", groupId: "group-a" },
    ],
    dependencies: [],
    dimensions: [
      {
        id: "width",
        revisionId: "revision-a",
        min: "1",
        max: "5",
        step: "0.5",
        defaultValue: "2.5",
      },
    ],
    tiers: [
      {
        id: "tier-a",
        lowerInclusive: "0",
        upperExclusive: "100",
        amountMinor: "10",
      },
      {
        id: "tier-b",
        lowerInclusive: "100",
        upperExclusive: "200",
        amountMinor: "20",
      },
    ],
    rules: [rule],
    ...overrides,
  };
}

describe("pricing publication validation", () => {
  it("accepts a complete revision", () => {
    expect(validatePricingConfiguration(input())).toEqual({
      valid: true,
      issues: [],
    });
  });

  it("rejects impossible groups and cross-revision references", () => {
    const result = validatePricingConfiguration(
      input({
        groups: [
          { ...input().groups[0], selectionMode: "SINGLE", maxSelections: 2 },
        ],
        options: [
          { id: "option-a", revisionId: "revision-b", groupId: "group-a" },
        ],
        dependencies: [
          {
            sourceOptionId: "option-a",
            targetOptionId: "missing",
            sourceRevisionId: "revision-a",
            targetRevisionId: "revision-b",
            kind: "REQUIRES",
          },
        ],
      }),
    );
    expect(result.issues.map((item) => item.code)).toEqual(
      expect.arrayContaining([
        "GROUP_SINGLE_MAX_INVALID",
        "OPTION_CROSS_REVISION",
        "DEPENDENCY_REFERENCE_NOT_FOUND",
        "DEPENDENCY_CROSS_REVISION",
      ]),
    );
  });

  it("rejects dependency cycles and overlapping tiers", () => {
    const result = validatePricingConfiguration(
      input({
        dependencies: [
          {
            sourceOptionId: "option-a",
            targetOptionId: "option-b",
            sourceRevisionId: "revision-a",
            targetRevisionId: "revision-a",
            kind: "REQUIRES",
          },
          {
            sourceOptionId: "option-b",
            targetOptionId: "option-a",
            sourceRevisionId: "revision-a",
            targetRevisionId: "revision-a",
            kind: "REQUIRES",
          },
        ],
        tiers: [
          {
            id: "tier-a",
            lowerInclusive: "0",
            upperExclusive: "100",
            amountMinor: "10",
          },
          {
            id: "tier-b",
            lowerInclusive: "99.99",
            upperExclusive: "200",
            amountMinor: "20",
          },
        ],
      }),
    );
    expect(result.issues.map((item) => item.code)).toEqual(
      expect.arrayContaining(["DEPENDENCY_CYCLE", "TIER_OVERLAP"]),
    );
  });

  it("rejects dimensions outside their decimal step boundaries", () => {
    const result = validatePricingConfiguration(
      input({
        dimensions: [
          {
            id: "width",
            revisionId: "revision-a",
            min: "1",
            max: "5",
            step: "0.5",
            defaultValue: "2.4",
          },
        ],
      }),
    );
    expect(result.issues.map((item) => item.code)).toContain(
      "DIMENSION_DEFAULT_INVALID",
    );
  });

  it("fuzzes small dependency graphs without throwing", () => {
    for (let seed = 0; seed < 32; seed += 1) {
      const dependencies = Array.from({ length: seed % 5 }, (_, index) => ({
        sourceOptionId: index % 2 === 0 ? "option-a" : "option-b",
        targetOptionId: index % 2 === 0 ? "option-b" : "option-a",
        sourceRevisionId: "revision-a",
        targetRevisionId: "revision-a",
        kind: "REQUIRES" as const,
      }));
      expect(() =>
        validatePricingConfiguration(input({ dependencies })),
      ).not.toThrow();
    }
  });
});
