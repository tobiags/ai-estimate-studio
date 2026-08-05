import { z } from "zod";

const absoluteUrl = z.url();

const serverEnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    APP_ENV: z.enum(["development", "preview", "production", "test"]),
    RELEASE_SHA: z.string().min(7).optional(),
    DATABASE_URL: z.string().min(1),
    DIRECT_DATABASE_URL: z.string().min(1),
    OBJECT_STORAGE_ENDPOINT: absoluteUrl,
    OBJECT_STORAGE_REGION: z.string().min(1),
    OBJECT_STORAGE_BUCKET: z.string().min(1),
    OBJECT_STORAGE_ACCESS_KEY: z.string().min(1),
    OBJECT_STORAGE_SECRET_KEY: z.string().min(1),
    AI_PROVIDER: z.enum(["fake", "openai"]),
    EMAIL_PROVIDER: z.enum(["fake", "resend"]),
  })
  .superRefine((environment, context) => {
    if (
      environment.APP_ENV === "production" &&
      (environment.AI_PROVIDER === "fake" ||
        environment.EMAIL_PROVIDER === "fake")
    ) {
      context.addIssue({
        code: "custom",
        message: "Fake providers are not permitted in production.",
      });
    }
  });

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: absoluteUrl,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function parseServerEnv(source: Record<string, unknown>): ServerEnv {
  return serverEnvSchema.parse(source);
}

export function parsePublicEnv(source: Record<string, unknown>): PublicEnv {
  return publicEnvSchema.parse(source);
}
