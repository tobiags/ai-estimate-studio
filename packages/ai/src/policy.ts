import { AiPolicyError } from "./errors.js";

export type AiPolicy = Readonly<{
  maxSystemChars: number;
  maxUserChars: number;
  maxContextChars: number;
  allowCustomerPii: false;
}>;

const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const phonePattern = /(?:\+\d[\d .()-]{7,}\d|\b\d{10,15}\b)/;

export const defaultAiPolicy: AiPolicy = Object.freeze({
  maxSystemChars: 8_000,
  maxUserChars: 8_000,
  maxContextChars: 24_000,
  allowCustomerPii: false,
});

export function assertSafeAiInput(
  input: Readonly<{ system: string; user: string; context: string }>,
  policy: AiPolicy = defaultAiPolicy,
): void {
  if (
    input.system.length > policy.maxSystemChars ||
    input.user.length > policy.maxUserChars ||
    input.context.length > policy.maxContextChars
  )
    throw new AiPolicyError(
      "PROMPT_TOO_LARGE",
      "AI prompt exceeds the configured budget",
    );
  if (
    emailPattern.test(input.system) ||
    emailPattern.test(input.user) ||
    emailPattern.test(input.context) ||
    phonePattern.test(input.system) ||
    phonePattern.test(input.user) ||
    phonePattern.test(input.context)
  )
    throw new AiPolicyError(
      "PII_REJECTED",
      "Customer contact data cannot be sent to the AI provider",
    );
}
