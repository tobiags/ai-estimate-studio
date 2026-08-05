import { describe, expect, it } from "vitest";
import {
  addMoney,
  compareMoney,
  createCurrencyCode,
  createMoney,
  MAX_MONEY_MINOR,
  MIN_MONEY_MINOR,
  multiplyMoney,
  subtractMoney,
} from "./money.js";

describe("money", () => {
  it("uses bounded integer minor units and preserves currency", () => {
    const euros = createCurrencyCode("eur");
    const first = createMoney(125n, euros);
    const second = createMoney(75n, euros);

    expect(addMoney(first, second)).toEqual({
      amountMinor: 200n,
      currency: "EUR",
    });
    expect(subtractMoney(first, second)).toEqual({
      amountMinor: 50n,
      currency: "EUR",
    });
    expect(multiplyMoney(first, 3n)).toEqual({
      amountMinor: 375n,
      currency: "EUR",
    });
    expect(compareMoney(first, second)).toBe(1);
  });

  it("rejects mismatched currencies and 64-bit overflow", () => {
    const eur = createCurrencyCode("EUR");
    const usd = createCurrencyCode("USD");

    expect(() => addMoney(createMoney(1n, eur), createMoney(1n, usd))).toThrow(
      "Money currency mismatch",
    );
    expect(() => createMoney(MIN_MONEY_MINOR - 1n, eur)).toThrow(
      "Money amount is outside",
    );
    expect(() => createMoney(MAX_MONEY_MINOR + 1n, eur)).toThrow(
      "Money amount is outside",
    );
    expect(() =>
      addMoney(createMoney(MAX_MONEY_MINOR, eur), createMoney(1n, eur)),
    ).toThrow("Money amount is outside");
  });

  it("rejects invalid currency codes and non-integral quantities", () => {
    expect(() => createCurrencyCode("EU")).toThrow("Invalid currency code");
    expect(() => createCurrencyCode("EURO")).toThrow("Invalid currency code");
    expect(() =>
      multiplyMoney(createMoney(10n, createCurrencyCode("EUR")), 0n),
    ).not.toThrow();
  });
});
