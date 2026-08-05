import { z } from "zod";

export const citationSchema = z
  .object({
    entityType: z.enum(["VARIANT", "OPTION", "DIMENSION", "PRICE_LINE"]),
    entityId: z.string().min(1),
  })
  .strict();
export const recommendationOutputSchema = z
  .object({
    summary: z.string().min(1).max(600),
    suggestions: z
      .array(
        z
          .object({
            kind: z.enum([
              "CHEAPER_ALTERNATIVE",
              "PREMIUM_UPGRADE",
              "EXPLANATION",
            ]),
            title: z.string().min(1).max(120),
            rationale: z.string().min(1).max(400),
            addOptionIds: z.array(z.string()),
            removeOptionIds: z.array(z.string()),
            verifiedDeltaMinor: z.string().regex(/^-?\d+$/),
            currency: z.string().regex(/^[A-Z]{3}$/),
            citations: z.array(citationSchema),
          })
          .strict(),
      )
      .max(3),
    warnings: z.array(z.string().max(300)).max(20),
  })
  .strict();

export type RecommendationOutput = z.infer<typeof recommendationOutputSchema>;
