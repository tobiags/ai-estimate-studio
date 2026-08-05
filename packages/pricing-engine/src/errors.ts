export type PricingErrorCode =
  | "INVALID_MONEY"
  | "MONEY_OVERFLOW"
  | "INVALID_ROUNDING"
  | "INVALID_RULE"
  | "RULE_LIMIT_EXCEEDED"
  | "UNKNOWN_FACT";

export class PricingError extends Error {
  readonly code: PricingErrorCode;

  constructor(code: PricingErrorCode, message: string) {
    super(message);
    this.name = "PricingError";
    this.code = code;
  }
}
