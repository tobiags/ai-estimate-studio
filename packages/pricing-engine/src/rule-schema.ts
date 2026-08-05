import { z } from "zod";
import { PricingError } from "./errors.js";

const integerStringSchema = z.string().regex(/^-?[0-9]+$/);
const codeSchema = z.string().regex(/^[A-Z0-9][A-Z0-9_.-]{0,63}$/);
const factPathSchema = z
  .string()
  .regex(
    /^(?:variantId|locale|evaluationTimestamp|dimensions\.[A-Za-z0-9_.-]+|delivery\.(?:countryCode|zoneCode))$/,
  );
const scalarSchema = z.union([z.string().max(256), z.boolean(), z.null()]);

export type RuleCondition =
  | { all: RuleCondition[] }
  | { any: RuleCondition[] }
  | { not: RuleCondition }
  | { equals: { fact: string; value: string | boolean | null } }
  | { in: { fact: string; values: (string | boolean | null)[] } }
  | { exists: { fact: string } };

const conditionSchema: z.ZodType<RuleCondition> = z.lazy(() =>
  z.union([
    z.object({ all: z.array(conditionSchema).min(1).max(32) }).strict(),
    z.object({ any: z.array(conditionSchema).min(1).max(32) }).strict(),
    z.object({ not: conditionSchema }).strict(),
    z
      .object({
        equals: z
          .object({ fact: factPathSchema, value: scalarSchema })
          .strict(),
      })
      .strict(),
    z
      .object({
        in: z
          .object({
            fact: factPathSchema,
            values: z.array(scalarSchema).min(1).max(64),
          })
          .strict(),
      })
      .strict(),
    z.object({ exists: z.object({ fact: factPathSchema }).strict() }).strict(),
  ]),
);

const lineActionSchema = z
  .object({
    type: z.literal("ADD_LINE"),
    code: codeSchema,
    kind: z.enum([
      "BASE",
      "OPTION",
      "DIMENSION",
      "LABOUR",
      "DELIVERY",
      "DISCOUNT",
      "TAX",
      "FEE",
    ]),
    label: z.string().min(1).max(200),
    amountMinor: integerStringSchema,
    taxClass: z.string().max(64).nullable().optional(),
  })
  .strict();

const percentageActionSchema = z
  .object({
    type: z.literal("PERCENT"),
    basis: z.enum(["SUBTOTAL", "TAXABLE_SUBTOTAL"]),
    rateBps: integerStringSchema,
    label: z.string().min(1).max(200),
  })
  .strict();

export const ruleActionSchema = z.discriminatedUnion("type", [
  lineActionSchema,
  percentageActionSchema,
]);

export const pricingRuleSchema = z
  .object({
    id: z.string().uuid(),
    code: codeSchema,
    kind: z.enum([
      "BASE",
      "OPTION",
      "DIMENSION",
      "LABOUR",
      "DELIVERY",
      "DISCOUNT",
      "TAX",
      "FEE",
    ]),
    priority: z.number().int().min(-1_000_000).max(1_000_000),
    label: z.string().min(1).max(200),
    condition: conditionSchema,
    action: ruleActionSchema,
    stackGroup: codeSchema.nullable().optional(),
    exclusiveInGroup: z.boolean().default(false),
    taxClass: codeSchema.nullable().optional(),
  })
  .strict();

export const pricingRuleSetSchema = z
  .object({
    schemaVersion: z.number().int().min(1).max(100),
    currency: z.string().regex(/^[A-Z]{3}$/),
    rules: z.array(pricingRuleSchema).max(10_000),
  })
  .strict();

export type RuleAction = z.infer<typeof ruleActionSchema>;
export type PricingRule = z.infer<typeof pricingRuleSchema>;
export type PricingRuleSet = z.infer<typeof pricingRuleSetSchema>;

const MAX_CONDITION_DEPTH = 16;
const MAX_RULE_JSON_BYTES = 64 * 1024;

function conditionDepth(condition: RuleCondition): number {
  if ("all" in condition)
    return 1 + Math.max(...condition.all.map(conditionDepth));
  if ("any" in condition)
    return 1 + Math.max(...condition.any.map(conditionDepth));
  if ("not" in condition) return 1 + conditionDepth(condition.not);
  return 1;
}

export function parsePricingRuleSet(input: unknown): PricingRuleSet {
  const serialized = JSON.stringify(input);
  if (serialized.length > MAX_RULE_JSON_BYTES) {
    throw new PricingError(
      "RULE_LIMIT_EXCEEDED",
      "Pricing rule set exceeds the JSON size limit",
    );
  }
  const parsed = pricingRuleSetSchema.safeParse(input);
  if (!parsed.success) {
    throw new PricingError(
      "INVALID_RULE",
      parsed.error.issues[0]?.message ?? "Invalid pricing rule set",
    );
  }
  const codes = new Set<string>();
  for (const rule of parsed.data.rules) {
    if (codes.has(rule.code))
      throw new PricingError(
        "INVALID_RULE",
        `Duplicate pricing rule code: ${rule.code}`,
      );
    codes.add(rule.code);
    if (conditionDepth(rule.condition) > MAX_CONDITION_DEPTH) {
      throw new PricingError(
        "RULE_LIMIT_EXCEEDED",
        `Condition depth exceeds ${MAX_CONDITION_DEPTH}`,
      );
    }
    if (
      rule.action.type === "PERCENT" &&
      (BigInt(rule.action.rateBps) < -100_000n ||
        BigInt(rule.action.rateBps) > 100_000n)
    ) {
      throw new PricingError(
        "INVALID_RULE",
        "Percentage action must remain within ±1000%",
      );
    }
  }
  return parsed.data;
}
