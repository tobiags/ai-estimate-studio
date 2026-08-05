import { z } from "zod";
import { dateTimeSchema, uuidSchema } from "./primitives.js";
import type { minorAmountSchema } from "./primitives.js";
import { pricePreviewSchema } from "./configuration.js";

export const customerInputSchema = z
  .object({
    name: z.string().min(1).max(200),
    email: z.email().max(320),
    phone: z.string().max(32).nullable().optional(),
    locale: z.string().min(2),
  })
  .strict();

export const consentInputSchema = z.object({
  purpose: z.enum(["QUOTE_FOLLOW_UP", "MARKETING", "PRIVACY_POLICY"]),
  granted: z.boolean(),
  policyVersion: z.string().min(1),
});

export const issueQuoteRequestSchema = z
  .object({
    configurationId: uuidSchema,
    configurationVersion: z.number().int().min(1),
    customer: customerInputSchema,
    consents: z.array(consentInputSchema).min(2),
  })
  .strict();

export const quotePublicViewSchema = z.object({
  quoteNumber: z.string(),
  status: z.enum([
    "ISSUED",
    "VIEWED",
    "CONTACTED",
    "ACCEPTED",
    "REJECTED",
    "EXPIRED",
    "VOID",
  ]),
  issuedAt: dateTimeSchema,
  expiresAt: dateTimeSchema,
  price: pricePreviewSchema,
  selectionSummary: z.record(z.string(), z.unknown()),
  assumptions: z.array(z.string()).optional(),
  exclusions: z.array(z.string()).optional(),
  aiSummary: z.string().nullable().optional(),
  pdfStatus: z.enum(["PENDING", "READY", "FAILED"]),
  publicUrl: z.url(),
});

export const jobStatusSchema = z.object({
  status: z.enum(["PENDING", "RUNNING", "SUCCEEDED", "FAILED"]),
  retryAfterSeconds: z.number().int().nonnegative().optional(),
});

export const quoteStatusWriteSchema = z
  .object({
    version: z.number().int().min(1),
    status: z.enum([
      "VIEWED",
      "CONTACTED",
      "ACCEPTED",
      "REJECTED",
      "EXPIRED",
      "VOID",
    ]),
    note: z.string().max(2000).optional(),
  })
  .strict();

export type IssueQuoteRequest = z.infer<typeof issueQuoteRequestSchema>;
export type QuotePublicView = z.infer<typeof quotePublicViewSchema>;
export type QuoteStatusWrite = z.infer<typeof quoteStatusWriteSchema>;
export type JobStatus = z.infer<typeof jobStatusSchema>;
export type QuoteAmount = z.infer<typeof minorAmountSchema>;
