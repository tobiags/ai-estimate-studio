import { z } from "zod";
import {
  localizedTextSchema,
  moneySchema,
  pageSchema,
  uuidSchema,
} from "./primitives.js";
import type { currencySchema } from "./primitives.js";

export const categorySummarySchema = z.object({
  id: uuidSchema,
  slug: z.string(),
  name: z.string(),
  description: z.string().optional(),
});

export const productSummarySchema = z.object({
  id: uuidSchema,
  slug: z.string(),
  name: z.string(),
  summary: z.string().optional(),
  posterUrl: z.string().url().nullable().optional(),
  startingPrice: moneySchema,
});

export const categoryPageSchema = z.object({
  data: z.array(categorySummarySchema),
  page: pageSchema,
});

export const productPageSchema = z.object({
  data: z.array(productSummarySchema),
  page: pageSchema,
});

export const categoryDetailSchema = categorySummarySchema.extend({
  products: z.array(productSummarySchema),
});

export const variantSchema = z.object({
  id: uuidSchema,
  code: z.string(),
  name: z.string(),
  description: z.string().optional(),
  basePrice: moneySchema,
});

export const productOptionSchema = z.object({
  id: uuidSchema,
  code: z.string(),
  name: z.string(),
  description: z.string().optional(),
  viewerMappingKey: z.string().nullable().optional(),
});

export const optionGroupSchema = z.object({
  id: uuidSchema,
  code: z.string(),
  name: z.string(),
  mode: z.enum(["SINGLE", "MULTIPLE"]),
  minSelections: z.number().int().min(0),
  maxSelections: z.number().int().min(1).nullable().optional(),
  options: z.array(productOptionSchema),
});

export const dimensionDefinitionSchema = z.object({
  id: uuidSchema,
  code: z.string(),
  label: z.string(),
  unit: z.string(),
  minValue: z.string(),
  maxValue: z.string(),
  stepValue: z.string(),
  defaultValue: z.string().nullable().optional(),
});

export const productDetailSchema = productSummarySchema.extend({
  revisionId: uuidSchema,
  description: z.string().optional(),
  variants: z.array(variantSchema),
  optionGroups: z.array(optionGroupSchema),
  dimensions: z.array(dimensionDefinitionSchema),
  viewer: z.record(z.string(), z.unknown()).nullable().optional(),
  assumptions: z.array(z.string()),
  exclusions: z.array(z.string()),
});

export const localizedCatalogWriteSchema = z.object({
  slug: z.string(),
  name: localizedTextSchema,
  description: localizedTextSchema,
});

export type CategorySummary = z.infer<typeof categorySummarySchema>;
export type ProductSummary = z.infer<typeof productSummarySchema>;
export type ProductDetail = z.infer<typeof productDetailSchema>;
export type CatalogCurrency = z.infer<typeof currencySchema>;
