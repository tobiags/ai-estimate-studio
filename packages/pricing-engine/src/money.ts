import { PricingError } from "./errors.js";

export const MIN_INT64 = -(2n ** 63n);
export const MAX_INT64 = 2n ** 63n - 1n;

function assertInt64(value: bigint): bigint {
  if (value < MIN_INT64 || value > MAX_INT64) {
    throw new PricingError(
      "MONEY_OVERFLOW",
      "Money amount exceeds signed 64-bit bounds",
    );
  }
  return value;
}

export type Money = Readonly<{ amountMinor: bigint; currency: string }>;

export function money(
  amountMinor: bigint | number | string,
  currency: string,
): Money {
  const amount =
    typeof amountMinor === "bigint" ? amountMinor : BigInt(amountMinor);
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new PricingError(
      "INVALID_MONEY",
      "Currency must be an ISO 4217 uppercase code",
    );
  }
  return Object.freeze({ amountMinor: assertInt64(amount), currency });
}

function assertSameCurrency(left: Money, right: Money): void {
  if (left.currency !== right.currency) {
    throw new PricingError(
      "INVALID_MONEY",
      "Cannot combine money with different currencies",
    );
  }
}

export function addMoney(left: Money, right: Money): Money {
  assertSameCurrency(left, right);
  return money(
    assertInt64(left.amountMinor + right.amountMinor),
    left.currency,
  );
}

export function subtractMoney(left: Money, right: Money): Money {
  assertSameCurrency(left, right);
  return money(
    assertInt64(left.amountMinor - right.amountMinor),
    left.currency,
  );
}

export type RoundingMode =
  "HALF_AWAY_FROM_ZERO" | "HALF_EVEN" | "FLOOR" | "CEIL";

export function roundRatio(
  numerator: bigint,
  denominator: bigint,
  mode: RoundingMode,
): bigint {
  if (denominator <= 0n) {
    throw new PricingError(
      "INVALID_ROUNDING",
      "Rounding denominator must be positive",
    );
  }

  const sign = numerator < 0n ? -1n : 1n;
  const absolute = numerator < 0n ? -numerator : numerator;
  const quotient = absolute / denominator;
  const remainder = absolute % denominator;

  let rounded = quotient;
  if (mode === "FLOOR")
    rounded = sign < 0n && remainder > 0n ? quotient + 1n : quotient;
  else if (mode === "CEIL")
    rounded = sign > 0n && remainder > 0n ? quotient + 1n : quotient;
  else if (remainder * 2n > denominator) rounded = quotient + 1n;
  else if (remainder * 2n === denominator) {
    rounded =
      mode === "HALF_EVEN" && quotient % 2n === 0n ? quotient : quotient + 1n;
  }

  return assertInt64(sign * rounded);
}

export function multiplyMoney(
  value: Money,
  numerator: bigint,
  denominator: bigint,
  rounding: RoundingMode = "HALF_AWAY_FROM_ZERO",
): Money {
  return money(
    roundRatio(value.amountMinor * numerator, denominator, rounding),
    value.currency,
  );
}
