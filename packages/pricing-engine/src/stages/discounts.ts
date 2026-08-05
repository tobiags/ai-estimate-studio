import { money } from "../money.js";
import type { PriceLine } from "../evaluator/types.js";

export type DiscountCandidate = Readonly<{
  code: string;
  label: string;
  amountMinor: bigint | string;
  priority?: number;
  stackGroup?: string;
  exclusive?: boolean;
}>;

export type DiscountPolicy = Readonly<{
  currency: string;
  stackMode: "STACK" | "BEST_ONLY" | "EXCLUSIVE";
  maxDiscountMinor?: bigint | string;
}>;

function value(candidate: DiscountCandidate): bigint {
  const amount =
    typeof candidate.amountMinor === "bigint"
      ? candidate.amountMinor
      : BigInt(candidate.amountMinor);
  return amount < 0n ? -amount : amount;
}

function ordered(
  candidates: readonly DiscountCandidate[],
): DiscountCandidate[] {
  return [...candidates].sort(
    (left, right) =>
      (right.priority ?? 0) - (left.priority ?? 0) ||
      left.code.localeCompare(right.code),
  );
}

function selectCandidates(
  candidates: readonly DiscountCandidate[],
  mode: DiscountPolicy["stackMode"],
): DiscountCandidate[] {
  const sorted = ordered(candidates);
  if (mode === "BEST_ONLY") {
    const best = [...sorted].sort((left, right) =>
      value(right) > value(left) ? 1 : value(right) < value(left) ? -1 : 0,
    )[0];
    return best ? [best] : [];
  }
  const selected: DiscountCandidate[] = [];
  const groups = new Set<string>();
  for (const candidate of sorted) {
    const group = candidate.stackGroup ?? `__${candidate.code}`;
    if (groups.has(group)) continue;
    if (mode === "EXCLUSIVE" || candidate.exclusive) groups.add(group);
    selected.push(candidate);
  }
  return selected;
}

export function applyDiscounts(
  lines: readonly PriceLine[],
  candidates: readonly DiscountCandidate[],
  policy: DiscountPolicy,
): readonly PriceLine[] {
  const subtotal = lines.reduce(
    (sum, line) => sum + BigInt(line.totalAmountMinor),
    0n,
  );
  const maximum =
    policy.maxDiscountMinor === undefined
      ? subtotal
      : BigInt(policy.maxDiscountMinor);
  let remaining = maximum < subtotal ? maximum : subtotal;
  if (remaining <= 0n) return Object.freeze([...lines]);

  const result = [...lines];
  for (const candidate of selectCandidates(candidates, policy.stackMode)) {
    const saving = value(candidate);
    const applied = saving > remaining ? remaining : saving;
    if (applied <= 0n) continue;
    result.push({
      order: result.length,
      code: candidate.code,
      kind: "DISCOUNT",
      label: candidate.label,
      quantity: "1",
      unit: null,
      taxClass: null,
      netAmountMinor: (-applied).toString(),
      taxAmountMinor: "0",
      totalAmountMinor: (-applied).toString(),
    });
    remaining -= applied;
    if (remaining === 0n) break;
  }
  money(
    result.reduce((sum, line) => sum + BigInt(line.totalAmountMinor), 0n),
    policy.currency,
  );
  return Object.freeze(result);
}
