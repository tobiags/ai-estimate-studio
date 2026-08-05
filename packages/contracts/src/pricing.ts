import { z } from "zod";
import {
  currencySchema,
  dateTimeSchema,
  positiveVersionSchema,
  uuidSchema,
} from "./primitives.js";

export const pricingRuleSetIdSchema = uuidSchema;

export const pricingDraftRequestSchema = z
  .object({
    version: positiveVersionSchema,
    schemaVersion: positiveVersionSchema,
    currency: currencySchema,
    rules: z.array(z.unknown()).max(10_000),
    validation: z.unknown(),
  })
  .strict();

export const pricingScenarioRequestSchema = z
  .object({
    name: z.string().min(1).max(200),
    facts: z.unknown(),
  })
  .strict();

export const pricingPublicationRequestSchema = z
  .object({
    version: positiveVersionSchema,
    effectiveFrom: dateTimeSchema,
    effectiveUntil: dateTimeSchema.nullable(),
    scenarios: z.array(pricingScenarioRequestSchema).max(100),
  })
  .strict();

export type PricingDraftRequest = z.infer<typeof pricingDraftRequestSchema>;
export type PricingScenarioRequest = z.infer<
  typeof pricingScenarioRequestSchema
>;
export type PricingPublicationRequest = z.infer<
  typeof pricingPublicationRequestSchema
>;
