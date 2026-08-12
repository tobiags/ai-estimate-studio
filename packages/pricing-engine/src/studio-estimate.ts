import { applyTaxes } from "./stages/taxes.js";
import { PricingError } from "./errors.js";
import type { PriceLine } from "./evaluator/types.js";

export type StudioPricingConfiguration = Readonly<{
  baseCode: string;
  walls: readonly Readonly<{ id: string; code: string }>[];
  accessories: readonly Readonly<{
    id: string;
    code: string;
    targetWallId: string;
  }>[];
}>;

export type StudioPricingCatalog = Readonly<{
  bases: readonly Readonly<{ code: string; priceMinor: number }>[];
  walls: readonly Readonly<{ code: string; priceMinor: number }>[];
  accessories: readonly Readonly<{ code: string; priceMinor: number }>[];
}>;

export type StudioEstimateInput = Readonly<{
  configuration: StudioPricingConfiguration;
  catalog: StudioPricingCatalog;
  taxRateBps?: bigint | string;
  currency?: string;
}>;

export type StudioEstimate = Readonly<{
  currency: string;
  subtotalMinor: string;
  discountMinor: string;
  taxMinor: string;
  totalMinor: string;
  lines: readonly PriceLine[];
}>;

function amount(value: number, code: string): bigint {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new PricingError(
      "INVALID_RULE",
      `Mobup price for ${code} must be a non-negative integer`,
    );
  }
  return BigInt(value);
}

function findPrice(
  entries: readonly Readonly<{ code: string; priceMinor: number }>[],
  code: string,
): bigint {
  const entry = entries.find((item) => item.code === code);
  if (!entry) {
    throw new PricingError("INVALID_RULE", `Unknown Mobup price code: ${code}`);
  }
  return amount(entry.priceMinor, code);
}

function line(
  order: number,
  code: string,
  kind: string,
  label: string,
  netAmountMinor: bigint,
): PriceLine {
  return {
    order,
    code,
    kind,
    label,
    quantity: "1",
    unit: null,
    taxClass: "STANDARD",
    netAmountMinor: netAmountMinor.toString(),
    taxAmountMinor: "0",
    totalAmountMinor: netAmountMinor.toString(),
  };
}

export function evaluateStudioEstimate(
  input: StudioEstimateInput,
): StudioEstimate {
  const currency = input.currency ?? "EUR";
  const taxRateBps =
    typeof input.taxRateBps === "bigint"
      ? input.taxRateBps
      : BigInt(input.taxRateBps ?? "2000");
  const lines: PriceLine[] = [];
  let order = 0;

  lines.push(
    line(
      order++,
      `BASE_${input.configuration.baseCode}`,
      "BASE",
      input.configuration.baseCode,
      findPrice(input.catalog.bases, input.configuration.baseCode),
    ),
  );
  for (const wall of input.configuration.walls) {
    lines.push(
      line(
        order++,
        `WALL_${wall.code}_${wall.id}`,
        "OPTION",
        wall.code,
        findPrice(input.catalog.walls, wall.code),
      ),
    );
  }
  for (const accessory of input.configuration.accessories) {
    lines.push(
      line(
        order++,
        `ACCESSORY_${accessory.code}_${accessory.id}`,
        "OPTION",
        accessory.code,
        findPrice(input.catalog.accessories, accessory.code),
      ),
    );
  }

  const taxedLines = applyTaxes(
    lines,
    [{ taxClass: "STANDARD", rateBps: taxRateBps }],
    {
      currency,
      mode: "EXCLUSIVE",
      rounding: "TOTAL",
      roundingMode: "HALF_AWAY_FROM_ZERO",
    },
  );
  const subtotalMinor = taxedLines.reduce(
    (total, item) => total + BigInt(item.netAmountMinor),
    0n,
  );
  const taxMinor = taxedLines.reduce(
    (total, item) => total + BigInt(item.taxAmountMinor),
    0n,
  );
  const totalMinor = taxedLines.reduce(
    (total, item) => total + BigInt(item.totalAmountMinor),
    0n,
  );

  return Object.freeze({
    currency,
    subtotalMinor: subtotalMinor.toString(),
    discountMinor: "0",
    taxMinor: taxMinor.toString(),
    totalMinor: totalMinor.toString(),
    lines: Object.freeze(taxedLines),
  });
}
