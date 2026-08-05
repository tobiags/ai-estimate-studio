import { describe, expect, it } from "vitest";
import {
  MAX_INT64,
  MIN_INT64,
  PricingError,
  addMoney,
  money,
  multiplyMoney,
  parsePricingRuleSet,
  readFact,
  roundRatio,
} from "./index";

describe("integer pricing primitives", () => {
  it("keeps money in signed 64-bit bounds and prevents currency mixing", () => {
    expect(money(MAX_INT64, "EUR").amountMinor).toBe(MAX_INT64);
    expect(() => money(MAX_INT64 + 1n, "EUR")).toThrow(PricingError);
    expect(() => addMoney(money(1n, "EUR"), money(1n, "USD"))).toThrow(
      "different currencies",
    );
    expect(() => money(MIN_INT64 - 1n, "EUR")).toThrow("signed 64-bit");
  });

  it("rounds ratios without floating point and uses half-away / half-even rules", () => {
    expect(roundRatio(5n, 2n, "HALF_AWAY_FROM_ZERO")).toBe(3n);
    expect(roundRatio(-5n, 2n, "HALF_AWAY_FROM_ZERO")).toBe(-3n);
    expect(roundRatio(5n, 2n, "HALF_EVEN")).toBe(2n);
    expect(roundRatio(7n, 2n, "HALF_EVEN")).toBe(4n);
    expect(roundRatio(-1n, 2n, "FLOOR")).toBe(-1n);
    expect(roundRatio(1n, 2n, "CEIL")).toBe(1n);
    expect(() => roundRatio(1n, 0n, "CEIL")).toThrow("denominator");
  });

  it("multiplies a price by a rational rate with explicit rounding", () => {
    expect(multiplyMoney(money(100n, "EUR"), 125n, 100n).amountMinor).toBe(
      125n,
    );
  });
});

describe("safe pricing rule AST", () => {
  const baseRule = {
    id: "00000000-0000-4000-8000-000000000001",
    code: "BASE_PRICE",
    kind: "BASE",
    priority: 10,
    label: "Base price",
    condition: { exists: { fact: "variantId" } },
    action: {
      type: "ADD_LINE",
      code: "BASE",
      kind: "BASE",
      label: "Base",
      amountMinor: "10000",
    },
  };

  it("accepts bounded rules and rejects executable/duplicate constructs", () => {
    const parsed = parsePricingRuleSet({
      schemaVersion: 1,
      currency: "EUR",
      rules: [baseRule],
    });
    expect(parsed.rules[0]?.code).toBe("BASE_PRICE");
    expect(() =>
      parsePricingRuleSet({
        schemaVersion: 1,
        currency: "EUR",
        rules: [{ ...baseRule, action: { type: "CALL", code: "x" } }],
      }),
    ).toThrow("Invalid");
    expect(() =>
      parsePricingRuleSet({
        schemaVersion: 1,
        currency: "EUR",
        rules: [baseRule, baseRule],
      }),
    ).toThrow("Duplicate");
  });

  it("caps condition depth and percentage rates", () => {
    let condition: unknown = { exists: { fact: "variantId" } };
    for (let index = 0; index < 17; index += 1) condition = { not: condition };
    expect(() =>
      parsePricingRuleSet({
        schemaVersion: 1,
        currency: "EUR",
        rules: [{ ...baseRule, condition }],
      }),
    ).toThrow("depth");
    expect(() =>
      parsePricingRuleSet({
        schemaVersion: 1,
        currency: "EUR",
        rules: [
          {
            ...baseRule,
            action: {
              type: "PERCENT",
              basis: "SUBTOTAL",
              rateBps: "100001",
              label: "unsafe",
            },
          },
        ],
      }),
    ).toThrow("±1000%");
  });

  it("reads only the allowlisted facts", () => {
    const facts = {
      optionIds: ["option-1"],
      dimensions: { width: "120" },
      delivery: { countryCode: "FR" },
      evaluationTimestamp: "2026-08-05T00:00:00Z",
    } as const;
    expect(readFact(facts, "dimensions.width")).toBe("120");
    expect(readFact(facts, "delivery.countryCode")).toBe("FR");
    expect(() =>
      readFact(facts, "dimensions.__proto__" as never),
    ).not.toThrow();
  });
});
