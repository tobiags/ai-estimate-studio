import { money, roundRatio } from "../money.js";
import type { PricingFacts } from "../facts.js";
import type { PricingRule, PricingRuleSet } from "../rule-schema.js";
import { evaluateCondition } from "./conditions.js";
import type {
  EvaluationInput,
  EvaluationResult,
  PriceLine,
  TraceEntry,
} from "./types.js";
import { canonicalize } from "../trace.js";

function orderedRules(rules: readonly PricingRule[]): PricingRule[] {
  return [...rules].sort(
    (left, right) =>
      left.priority - right.priority || left.code.localeCompare(right.code),
  );
}

function amountOf(line: PriceLine): bigint {
  return BigInt(line.totalAmountMinor);
}

function lineFrom(
  rule: PricingRule,
  amountMinor: bigint,
  order: number,
): PriceLine {
  return {
    order,
    code: rule.code,
    kind: rule.kind,
    label: rule.label,
    quantity: "1",
    unit: null,
    taxClass: rule.taxClass ?? null,
    netAmountMinor: amountMinor.toString(),
    taxAmountMinor: "0",
    totalAmountMinor: amountMinor.toString(),
  };
}

function evaluateRule(rule: PricingRule, lines: readonly PriceLine[]): bigint {
  if (rule.action.type === "ADD_LINE") return BigInt(rule.action.amountMinor);
  const basis = lines.reduce((sum, line) => sum + amountOf(line), 0n);
  return roundRatio(
    basis * BigInt(rule.action.rateBps),
    10_000n,
    "HALF_AWAY_FROM_ZERO",
  );
}

export function evaluatePricing(input: EvaluationInput): EvaluationResult {
  const { ruleSet, facts } = input;
  const currency = input.baseCurrency ?? ruleSet.currency;
  const lines: PriceLine[] = [];
  const trace: TraceEntry[] = [];
  let order = 0;

  for (const rule of orderedRules(ruleSet.rules)) {
    const matched = evaluateCondition(rule.condition, facts);
    if (!matched) {
      trace.push({
        order,
        ruleCode: rule.code,
        status: "SKIPPED",
        reason: "CONDITION_NOT_MATCHED",
        amountMinor: "0",
      });
      order += 1;
      continue;
    }
    const amountMinor = evaluateRule(rule, lines);
    const line = lineFrom(rule, amountMinor, order);
    lines.push(line);
    trace.push({
      order,
      ruleCode: rule.code,
      status: "APPLIED",
      reason: "CONDITION_MATCHED",
      amountMinor: amountMinor.toString(),
    });
    order += 1;
  }

  const subtotal = lines
    .filter((line) => line.kind !== "DISCOUNT" && line.kind !== "TAX")
    .reduce((sum, line) => sum + amountOf(line), 0n);
  const discount = lines
    .filter((line) => line.kind === "DISCOUNT")
    .reduce((sum, line) => sum + amountOf(line), 0n);
  const tax = lines
    .filter((line) => line.kind === "TAX")
    .reduce((sum, line) => sum + amountOf(line), 0n);
  const total = lines.reduce((sum, line) => sum + amountOf(line), 0n);
  money(total, currency);
  const result = {
    currency,
    subtotalMinor: subtotal.toString(),
    discountMinor: discount.toString(),
    taxMinor: tax.toString(),
    totalMinor: total.toString(),
    lines: Object.freeze(lines),
    trace: Object.freeze(trace),
  };
  return Object.freeze({ ...result, canonical: canonicalize(result) });
}

export function evaluateRuleSet(
  ruleSet: PricingRuleSet,
  facts: PricingFacts,
): EvaluationResult {
  return evaluatePricing({ ruleSet, facts });
}
