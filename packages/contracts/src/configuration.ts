import { z } from "zod";
import { dateTimeSchema, minorAmountSchema, uuidSchema } from "./primitives.js";
import type { Page } from "./primitives.js";

export const dimensionValueSchema = z.object({
  definitionId: uuidSchema,
  value: z.string(),
  unit: z.string(),
});

export const deliveryInputSchema = z
  .object({
    countryCode: z.string().length(2).optional(),
    postalCode: z.string().max(20).optional(),
    zoneCode: z.string().max(64).optional(),
  })
  .strict();

const optionIdsSchema = z.array(uuidSchema).superRefine((ids, context) => {
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: "custom", message: "optionIds must be unique" });
  }
});

export const priceLineSchema = z.object({
  code: z.string(),
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
  label: z.string(),
  quantity: z.string().optional(),
  unit: z.string().nullable().optional(),
  netAmountMinor: minorAmountSchema,
  taxAmountMinor: minorAmountSchema,
  totalAmountMinor: minorAmountSchema,
});

export const pricePreviewSchema = z.object({
  currency: z.string().regex(/^[A-Z]{3}$/),
  subtotalMinor: minorAmountSchema,
  discountMinor: minorAmountSchema,
  taxMinor: minorAmountSchema,
  totalMinor: minorAmountSchema,
  lines: z.array(priceLineSchema),
  warnings: z.array(
    z.object({
      path: z.string(),
      code: z.string(),
      message: z.string(),
      meta: z.record(z.string(), z.unknown()).optional(),
    }),
  ),
});

export const createConfigurationRequestSchema = z
  .object({
    productSlug: z.string().min(1),
    variantId: uuidSchema.optional(),
    optionIds: optionIdsSchema.default([]),
    dimensions: z.array(dimensionValueSchema).default([]),
    delivery: deliveryInputSchema.optional(),
    budgetMinor: minorAmountSchema.nullable().optional(),
    locale: z.string().min(2),
  })
  .strict();

export const updateConfigurationRequestSchema = z
  .object({
    version: z.number().int().min(1),
    variantId: uuidSchema,
    optionIds: optionIdsSchema,
    dimensions: z.array(dimensionValueSchema),
    delivery: deliveryInputSchema.optional(),
    budgetMinor: minorAmountSchema.nullable().optional(),
  })
  .strict();

export const configurationSchema = z.object({
  id: uuidSchema,
  productRevisionId: uuidSchema,
  pricingRuleSetId: uuidSchema,
  variantId: uuidSchema,
  optionIds: z.array(uuidSchema),
  dimensions: z.array(dimensionValueSchema),
  delivery: deliveryInputSchema.optional(),
  budgetMinor: minorAmountSchema.nullable().optional(),
  locale: z.string(),
  version: z.number().int().min(1),
  status: z.enum(["ACTIVE", "QUOTED", "ABANDONED"]),
  price: pricePreviewSchema,
  expiresAt: dateTimeSchema,
});

export const recommendationRequestSchema = z
  .object({
    goal: z.string().max(1000).optional(),
    budgetMinor: minorAmountSchema.nullable().optional(),
    locale: z.string().min(2).optional(),
  })
  .strict();

export const suggestionSchema = z.object({
  kind: z.enum(["CHEAPER_ALTERNATIVE", "PREMIUM_UPGRADE", "EXPLANATION"]),
  title: z.string().max(120),
  rationale: z.string().max(400),
  removeOptionIds: z.array(uuidSchema),
  addOptionIds: z.array(uuidSchema),
  targetVariantId: uuidSchema.nullable().optional(),
  verifiedDeltaMinor: minorAmountSchema,
  currency: z.string().regex(/^[A-Z]{3}$/),
  citations: z.array(
    z.object({
      entityType: z.enum(["VARIANT", "OPTION", "PRICE_LINE"]),
      entityId: z.string(),
    }),
  ),
});

export const recommendationSchema = z.object({
  id: uuidSchema,
  status: z.literal("VERIFIED"),
  promptVersion: z.string(),
  locale: z.string(),
  summary: z.string().max(600),
  budgetAssessment: z.record(z.string(), z.unknown()).optional(),
  suggestions: z.array(suggestionSchema).max(3),
  warnings: z.array(z.record(z.string(), z.unknown())),
  pdfSummary: z.string().max(500).optional(),
  createdAt: dateTimeSchema,
});

export type Configuration = z.infer<typeof configurationSchema>;
export type CreateConfigurationRequest = z.infer<
  typeof createConfigurationRequestSchema
>;
export type UpdateConfigurationRequest = z.infer<
  typeof updateConfigurationRequestSchema
>;
export type Recommendation = z.infer<typeof recommendationSchema>;
export type ConfigurationPage = {
  data: Configuration[];
  page: Page;
};
