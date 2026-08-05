import { z } from "zod";

export const uuidSchema = z.string().uuid();
export const currencySchema = z.string().regex(/^[A-Z]{3}$/);
export const localeSchema = z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/);
export const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const minorAmountSchema = z.string().regex(/^-?[0-9]+$/);
export const nonNegativeIntegerSchema = z.number().int().nonnegative();
export const positiveVersionSchema = z.number().int().min(1);
export const dateTimeSchema = z.iso.datetime({ offset: true });

export const moneySchema = z.object({
  amountMinor: minorAmountSchema,
  currency: currencySchema,
});

export const localizedTextSchema = z.record(
  localeSchema,
  z.string().min(1).max(10_000),
);

export const pageSchema = z.object({
  nextCursor: z.string().nullable().optional(),
  hasMore: z.boolean(),
});

export const validationItemSchema = z.object({
  path: z.string(),
  code: z.string(),
  message: z.string(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const problemSchema = z.object({
  type: z.string().url(),
  title: z.string(),
  status: z.number().int().min(400).max(599),
  detail: z.string().optional(),
  instance: z.string().optional(),
  correlationId: z.string().min(1),
  errors: z.array(validationItemSchema).optional(),
});

export const healthSchema = z.object({
  status: z.literal("ok"),
  release: z.string(),
});

export const paginationQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const idempotencyKeySchema = z.string().min(16).max(128);
export const csrfTokenSchema = z.string().min(16);

export type Money = z.infer<typeof moneySchema>;
export type Page = z.infer<typeof pageSchema>;
export type Problem = z.infer<typeof problemSchema>;
export type ValidationItem = z.infer<typeof validationItemSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
