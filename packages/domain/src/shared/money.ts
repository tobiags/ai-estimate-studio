import { DomainValidationError, DomainInvariantError } from "./errors.js";
import type { Brand } from "./ids.js";

export type CurrencyCode = Brand<string, "CurrencyCode">;
export type Money = Readonly<{ amountMinor: bigint; currency: CurrencyCode }>;

export const MIN_MONEY_MINOR = -(2n ** 63n);
export const MAX_MONEY_MINOR = 2n ** 63n - 1n;

function integer(value: bigint | number, label: string): bigint {
  if (typeof value === "bigint") return value;
  if (!Number.isSafeInteger(value)) {
    throw new DomainValidationError(`${label} must be an integer`, { label });
  }
  return BigInt(value);
}

function assertBounds(amountMinor: bigint): void {
  if (amountMinor < MIN_MONEY_MINOR || amountMinor > MAX_MONEY_MINOR) {
    throw new DomainValidationError(
      "Money amount is outside signed 64-bit bounds",
      {
        amountMinor: amountMinor.toString(),
      },
    );
  }
}

export function createCurrencyCode(value: unknown): CurrencyCode {
  if (typeof value !== "string" || !/^[A-Za-z]{3}$/.test(value)) {
    throw new DomainValidationError("Invalid currency code", { value });
  }
  return value.toUpperCase() as CurrencyCode;
}

export function createMoney(
  amountMinor: bigint | number,
  currency: CurrencyCode,
): Money {
  const amount = integer(amountMinor, "Money amount");
  assertBounds(amount);
  return Object.freeze({ amountMinor: amount, currency });
}

function assertSameCurrency(left: Money, right: Money): void {
  if (left.currency !== right.currency) {
    throw new DomainInvariantError("Money currency mismatch", {
      left: left.currency,
      right: right.currency,
    });
  }
}

export function addMoney(left: Money, right: Money): Money {
  assertSameCurrency(left, right);
  return createMoney(left.amountMinor + right.amountMinor, left.currency);
}

export function subtractMoney(left: Money, right: Money): Money {
  assertSameCurrency(left, right);
  return createMoney(left.amountMinor - right.amountMinor, left.currency);
}

export function multiplyMoney(value: Money, quantity: bigint | number): Money {
  return createMoney(
    value.amountMinor * integer(quantity, "Money quantity"),
    value.currency,
  );
}

export function compareMoney(left: Money, right: Money): -1 | 0 | 1 {
  assertSameCurrency(left, right);
  if (left.amountMinor === right.amountMinor) return 0;
  return left.amountMinor < right.amountMinor ? -1 : 1;
}

export function zeroMoney(currency: CurrencyCode): Money {
  return createMoney(0n, currency);
}
