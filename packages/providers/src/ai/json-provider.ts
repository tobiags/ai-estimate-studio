import {
  AiPolicyError,
  AiProviderError,
  assertSafeAiInput,
  type AiGenerationRequest,
  type AiGenerationResponse,
  type StructuredAiProvider,
} from "@ai-estimate-studio/ai";

export type ProviderTransportRequest = Readonly<
  AiGenerationRequest & { responseFormat: "json" }
>;

export type ProviderTransportResponse = Readonly<{
  text: string;
  requestId: string;
  model: string;
  costMinor?: string;
}>;

export interface ProviderTransport {
  complete(
    request: ProviderTransportRequest,
  ): Promise<ProviderTransportResponse>;
}

export type JsonProviderLimits = Readonly<{
  maxOutputChars?: number;
  maxCostMinor?: bigint;
}>;

function classifyTransportError(error: unknown): AiProviderError {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  if (["429", "RATE_LIMITED", "RESOURCE_EXHAUSTED"].includes(code))
    return new AiProviderError(
      "RATE_LIMITED",
      "AI provider rate limit reached",
    );
  if (["COST_LIMIT", "BUDGET_EXCEEDED"].includes(code))
    return new AiProviderError("COST_LIMIT", "AI provider cost limit reached");
  if (["ABORT_ERR", "ABORTED"].includes(code))
    return new AiProviderError("ABORTED", "AI provider request was aborted");
  return new AiProviderError(
    "PROVIDER_UNAVAILABLE",
    "AI provider transport is unavailable",
  );
}

export class JsonStructuredProvider implements StructuredAiProvider {
  private readonly limits: Required<
    Pick<JsonProviderLimits, "maxOutputChars">
  > &
    Omit<JsonProviderLimits, "maxOutputChars">;

  constructor(
    private readonly transport: ProviderTransport,
    limits: JsonProviderLimits = {},
  ) {
    this.limits = { maxOutputChars: 32_000, ...limits };
  }

  async generate<T>(
    request: AiGenerationRequest,
    schema: { parse(input: unknown): T },
  ): Promise<AiGenerationResponse<T>> {
    if (request.signal?.aborted)
      throw new AiProviderError("ABORTED", "AI provider request was aborted");
    assertSafeAiInput(request);
    const startedAt = Date.now();
    let response: ProviderTransportResponse;
    try {
      response = await this.transport.complete({
        ...request,
        responseFormat: "json",
      });
    } catch (error) {
      throw classifyTransportError(error);
    }
    if (request.signal?.aborted)
      throw new AiProviderError("ABORTED", "AI provider request was aborted");
    if (response.text.length > this.limits.maxOutputChars)
      throw new AiPolicyError(
        "SCHEMA_INVALID",
        "AI provider output exceeds the configured limit",
      );
    if (response.costMinor !== undefined) {
      try {
        const costMinor = BigInt(response.costMinor);
        if (costMinor < 0n)
          throw new AiPolicyError(
            "SCHEMA_INVALID",
            "AI provider returned an invalid cost value",
          );
        if (
          this.limits.maxCostMinor !== undefined &&
          costMinor > this.limits.maxCostMinor
        )
          throw new AiProviderError(
            "COST_LIMIT",
            "AI provider cost limit reached",
          );
      } catch (error) {
        if (error instanceof AiProviderError) throw error;
        throw new AiPolicyError(
          "SCHEMA_INVALID",
          "AI provider returned an invalid cost value",
        );
      }
    }
    let raw: unknown;
    try {
      raw = JSON.parse(response.text);
    } catch {
      throw new AiPolicyError(
        "SCHEMA_INVALID",
        "AI provider returned malformed JSON",
      );
    }
    let output: T;
    try {
      output = schema.parse(raw);
    } catch {
      throw new AiPolicyError(
        "SCHEMA_INVALID",
        "AI provider output failed schema validation",
      );
    }
    return {
      output,
      providerRequestId: response.requestId,
      model: response.model,
      latencyMs: Math.max(0, Date.now() - startedAt),
    };
  }
}
