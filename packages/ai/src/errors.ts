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

export class AiProviderError extends Error {
  constructor(
    readonly code:
      "PROVIDER_UNAVAILABLE" | "RATE_LIMITED" | "COST_LIMIT" | "ABORTED",
    message: string,
  ) {
    super(message);
    this.name = "AiProviderError";
  }
}

export class RecommendationVerificationError extends Error {
  constructor(
    readonly code:
      | "UNKNOWN_ENTITY"
      | "INVALID_COMBINATION"
      | "DELTA_MISMATCH"
      | "CURRENCY_MISMATCH"
      | "CITATION_UNKNOWN",
    message: string,
  ) {
    super(message);
    this.name = "RecommendationVerificationError";
  }
}
