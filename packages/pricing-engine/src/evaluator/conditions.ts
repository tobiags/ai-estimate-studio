import { readFact, type PricingFacts } from "../facts.js";
import type { RuleCondition } from "../rule-schema.js";

function scalarEqual(
  left: string | undefined,
  right: string | boolean | null,
): boolean {
  if (right === null) return left === undefined;
  return left === String(right);
}

export function evaluateCondition(
  condition: RuleCondition,
  facts: PricingFacts,
): boolean {
  if ("all" in condition)
    return condition.all.every((item) => evaluateCondition(item, facts));
  if ("any" in condition)
    return condition.any.some((item) => evaluateCondition(item, facts));
  if ("not" in condition) return !evaluateCondition(condition.not, facts);
  if ("equals" in condition)
    return scalarEqual(
      readFact(facts, condition.equals.fact as never),
      condition.equals.value,
    );
  if ("in" in condition)
    return condition.in.values.some((value) =>
      scalarEqual(readFact(facts, condition.in.fact as never), value),
    );
  return readFact(facts, condition.exists.fact as never) !== undefined;
}
