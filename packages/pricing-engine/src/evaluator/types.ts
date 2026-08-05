import type { PricingFacts } from "../facts.js";
import type { PricingRuleSet } from "../rule-schema.js";

export type EvaluationInput = Readonly<{
  ruleSet: PricingRuleSet;
  facts: PricingFacts;
  baseCurrency?: string;
}>;

export type PriceLine = Readonly<{
  order: number;
  code: string;
  kind: string;
  label: string;
  quantity: string;
  unit: string | null;
  taxClass?: string | null;
  netAmountMinor: string;
  taxAmountMinor: string;
  totalAmountMinor: string;
}>;

export type TraceEntry = Readonly<{
  order: number;
  ruleCode: string;
  status: "APPLIED" | "SKIPPED";
  reason: "CONDITION_MATCHED" | "CONDITION_NOT_MATCHED";
  amountMinor: string;
}>;

export type EvaluationResult = Readonly<{
  currency: string;
  subtotalMinor: string;
  discountMinor: string;
  taxMinor: string;
  totalMinor: string;
  lines: readonly PriceLine[];
  trace: readonly TraceEntry[];
  canonical: string;
}>;
