import { describe, expect, it } from "vitest";
import {
  evaluateRuleSet,
  type PricingFacts,
  type PricingRuleSet,
} from "../index";

const facts: PricingFacts = {
  variantId: "variant-a",
  optionIds: ["option-premium"],
  dimensions: { width: "120" },
  delivery: { countryCode: "FR" },
  evaluationTimestamp: "2026-08-05T00:00:00Z",
};

const rules: PricingRuleSet = {
  schemaVersion: 1,
  currency: "EUR",
  rules: [
    {
      id: "00000000-0000-4000-8000-000000000002",
      code: "PREMIUM_OPTION",
      kind: "OPTION",
      priority: 20,
      label: "Premium option",
      condition: { exists: { fact: "option.option-premium" } },
      action: {
        type: "ADD_LINE",
        code: "PREMIUM",
        kind: "OPTION",
        label: "Premium",
        amountMinor: "2500",
      },
    },
    {
      id: "00000000-0000-4000-8000-000000000001",
      code: "BASE_PRICE",
      kind: "BASE",
      priority: 10,
      label: "Base",
      condition: { exists: { fact: "variantId" } },
      action: {
        type: "ADD_LINE",
        code: "BASE",
        kind: "BASE",
        label: "Base",
        amountMinor: "10000",
      },
    },
    {
      id: "00000000-0000-4000-8000-000000000003",
      code: "DELIVERY_FR",
      kind: "DELIVERY",
      priority: 30,
      label: "Delivery",
      condition: { equals: { fact: "delivery.countryCode", value: "BE" } },
      action: {
        type: "ADD_LINE",
        code: "DELIVERY",
        kind: "DELIVERY",
        label: "Delivery",
        amountMinor: "1200",
      },
    },
  ],
};

describe("deterministic pricing evaluator", () => {
  it("evaluates ordered rules and records applied/skipped trace", () => {
    const result = evaluateRuleSet(rules, facts);
    expect(result.totalMinor).toBe("12500");
    expect(result.lines.map((line) => line.code)).toEqual([
      "BASE_PRICE",
      "PREMIUM_OPTION",
    ]);
    expect(result.trace.map((entry) => [entry.ruleCode, entry.status])).toEqual(
      [
        ["BASE_PRICE", "APPLIED"],
        ["PREMIUM_OPTION", "APPLIED"],
        ["DELIVERY_FR", "SKIPPED"],
      ],
    );
  });

  it("produces byte-equivalent output for different input rule ordering", () => {
    const first = evaluateRuleSet(rules, facts);
    const second = evaluateRuleSet(
      { ...rules, rules: [...rules.rules].reverse() },
      facts,
    );
    expect(second.canonical).toBe(first.canonical);
    expect(second.totalMinor).toBe(first.totalMinor);
  });

  it("evaluates percentage actions against the current subtotal", () => {
    const result = evaluateRuleSet(
      {
        schemaVersion: 1,
        currency: "EUR",
        rules: [
          rules.rules[1]!,
          {
            id: "00000000-0000-4000-8000-000000000004",
            code: "LABOUR_RATE",
            kind: "LABOUR",
            priority: 20,
            label: "Labour",
            condition: { exists: { fact: "variantId" } },
            action: {
              type: "PERCENT",
              basis: "SUBTOTAL",
              rateBps: "1250",
              label: "Labour",
            },
          },
        ],
      },
      facts,
    );
    expect(result.totalMinor).toBe("11250");
    expect(result.lines[1]?.totalAmountMinor).toBe("1250");
  });
});
