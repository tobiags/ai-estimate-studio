export class AiPolicyError extends Error {
  constructor(
    readonly code:
      | "PII_REJECTED"
      | "PROMPT_TOO_LARGE"
      | "SCHEMA_INVALID"
      | "PROVIDER_UNAVAILABLE",
    message: string,
  ) {
    super(message);
    this.name = "AiPolicyError";
  }
}
