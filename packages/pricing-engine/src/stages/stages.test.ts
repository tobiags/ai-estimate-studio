import { describe, expect, it } from "vitest";
import { applyDiscounts, applyTaxes, type PriceLine } from "../index";

const baseLines: PriceLine[] = [
  {
    order: 0,
    code: "BASE",
    kind: "BASE",
    label: "Base",
    quantity: "1",
    unit: null,
    taxClass: "STANDARD",
    netAmountMinor: "10000",
    taxAmountMinor: "0",
    totalAmountMinor: "10000",
  },
  {
    order: 1,
    code: "LABOUR",
    kind: "LABOUR",
    label: "Labour",
    quantity: "1",
    unit: null,
    taxClass: "STANDARD",
    netAmountMinor: "1",
    taxAmountMinor: "0",
    totalAmountMinor: "1",
  },
];

describe("discount stage", () => {
  it("stacks candidates deterministically and caps savings at subtotal", () => {
    const result = applyDiscounts(
      baseLines,
      [
        {
          code: "WELCOME",
          label: "Welcome",
          amountMinor: "2000",
          stackGroup: "promotion",
          priority: 2,
        },
        {
          code: "OVERRIDE",
          label: "Override",
          amountMinor: "20000",
          stackGroup: "override",
          priority: 1,
          exclusive: true,
        },
      ],
      { currency: "EUR", stackMode: "STACK", maxDiscountMinor: "5000" },
    );
    expect(result.at(-1)?.totalAmountMinor).toBe("-3000");
    expect(result.at(-2)?.totalAmountMinor).toBe("-2000");
    expect(
      result.reduce((sum, line) => sum + BigInt(line.totalAmountMinor), 0n),
    ).toBe(5001n);
  });

  it("selects only one candidate in BEST_ONLY mode", () => {
    const result = applyDiscounts(
      baseLines,
      [
        { code: "A", label: "A", amountMinor: "100" },
        { code: "B", label: "B", amountMinor: "200" },
      ],
      { currency: "EUR", stackMode: "BEST_ONLY" },
    );
    expect(result.filter((line) => line.kind === "DISCOUNT")).toHaveLength(1);
    expect(result.at(-1)?.code).toBe("B");
  });
});

describe("tax stage", () => {
  it("calculates exclusive per-line tax", () => {
    const result = applyTaxes(
      baseLines,
      [{ taxClass: "STANDARD", rateBps: "2000" }],
      { currency: "EUR", mode: "EXCLUSIVE", rounding: "PER_LINE" },
    );
    expect(result[0]?.taxAmountMinor).toBe("2000");
    expect(result[0]?.totalAmountMinor).toBe("12000");
  });

  it("calculates inclusive tax by backing net out of gross", () => {
    const result = applyTaxes(
      [
        {
          ...baseLines[0]!,
          netAmountMinor: "12000",
          totalAmountMinor: "12000",
        },
      ],
      [{ taxClass: "STANDARD", rateBps: "2000" }],
      { currency: "EUR", mode: "INCLUSIVE", rounding: "PER_LINE" },
    );
    expect(result[0]?.netAmountMinor).toBe("10000");
    expect(result[0]?.taxAmountMinor).toBe("2000");
  });

  it("allocates total rounding to the final line without losing a cent", () => {
    const result = applyTaxes(
      baseLines,
      [{ taxClass: "STANDARD", rateBps: "3333" }],
      { currency: "EUR", mode: "EXCLUSIVE", rounding: "TOTAL" },
    );
    const tax = result.reduce(
      (sum, line) => sum + BigInt(line.taxAmountMinor),
      0n,
    );
    expect(tax).toBe(3333n);
    expect(result.at(-1)?.taxAmountMinor).toBe("0");
  });
});
