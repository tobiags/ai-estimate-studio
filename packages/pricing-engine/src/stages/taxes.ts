import { money, roundRatio, type RoundingMode } from "../money.js";
import type { PriceLine } from "../evaluator/types.js";

export type TaxPolicy = Readonly<{
  currency: string;
  mode: "EXCLUSIVE" | "INCLUSIVE";
  rounding: "PER_LINE" | "TOTAL";
  roundingMode?: RoundingMode;
}>;

export type TaxRate = Readonly<{ taxClass: string; rateBps: bigint | string }>;

function rateValue(rate: TaxRate): bigint {
  const value =
    typeof rate.rateBps === "bigint" ? rate.rateBps : BigInt(rate.rateBps);
  if (value < 0n || value > 100_000n)
    throw new RangeError("Tax rate must be between 0 and 1000%");
  return value;
}

function lineBase(line: PriceLine): bigint {
  return BigInt(line.netAmountMinor);
}

function withAmounts(line: PriceLine, net: bigint, tax: bigint): PriceLine {
  return {
    ...line,
    netAmountMinor: net.toString(),
    taxAmountMinor: tax.toString(),
    totalAmountMinor: (net + tax).toString(),
  };
}

function perLine(
  lines: readonly PriceLine[],
  rates: ReadonlyMap<string, bigint>,
  policy: TaxPolicy,
): PriceLine[] {
  const rounding = policy.roundingMode ?? "HALF_AWAY_FROM_ZERO";
  return lines.map((line) => {
    const rate = line.taxClass ? rates.get(line.taxClass) : undefined;
    if (rate === undefined || line.kind === "TAX") return line;
    const grossOrNet = lineBase(line);
    if (policy.mode === "EXCLUSIVE") {
      const tax = roundRatio(grossOrNet * rate, 10_000n, rounding);
      return withAmounts(line, grossOrNet, tax);
    }
    const net = roundRatio(grossOrNet * 10_000n, 10_000n + rate, rounding);
    return withAmounts(line, net, grossOrNet - net);
  });
}

function totalExclusive(
  lines: readonly PriceLine[],
  rates: ReadonlyMap<string, bigint>,
  policy: TaxPolicy,
): PriceLine[] {
  const rounding = policy.roundingMode ?? "HALF_AWAY_FROM_ZERO";
  const byClass = new Map<string, PriceLine[]>();
  for (const line of lines) {
    if (!line.taxClass || line.kind === "TAX" || !rates.has(line.taxClass))
      continue;
    const group = byClass.get(line.taxClass) ?? [];
    group.push(line);
    byClass.set(line.taxClass, group);
  }
  const taxes = new Map<string, bigint>();
  for (const [taxClass, group] of byClass) {
    const rate = rates.get(taxClass)!;
    taxes.set(
      taxClass,
      roundRatio(
        group.reduce((sum, line) => sum + lineBase(line), 0n) * rate,
        10_000n,
        rounding,
      ),
    );
  }
  return lines.map((line) => {
    if (!line.taxClass || !byClass.has(line.taxClass)) return line;
    const group = byClass.get(line.taxClass)!;
    const position = group.indexOf(line);
    const totalTax = taxes.get(line.taxClass)!;
    const rate = rates.get(line.taxClass)!;
    const beforeLast = group
      .slice(0, -1)
      .reduce(
        (sum, item) =>
          sum + roundRatio(lineBase(item) * rate, 10_000n, rounding),
        0n,
      );
    const allocated =
      position === group.length - 1
        ? totalTax - beforeLast
        : roundRatio(lineBase(line) * rate, 10_000n, rounding);
    return withAmounts(line, lineBase(line), allocated);
  });
}

export function applyTaxes(
  lines: readonly PriceLine[],
  taxRates: readonly TaxRate[],
  policy: TaxPolicy,
): readonly PriceLine[] {
  const rates = new Map(
    taxRates.map((rate) => [rate.taxClass, rateValue(rate)]),
  );
  const result =
    policy.rounding === "TOTAL" && policy.mode === "EXCLUSIVE"
      ? totalExclusive(lines, rates, policy)
      : perLine(lines, rates, policy);
  money(
    result.reduce((sum, line) => sum + BigInt(line.totalAmountMinor), 0n),
    policy.currency,
  );
  return Object.freeze(result);
}
