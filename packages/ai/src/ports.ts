import { AiPolicyError } from "./errors.js";
import {
  recommendationOutputSchema,
  type RecommendationOutput,
} from "./schemas.js";

export type AiGenerationRequest = Readonly<{
  model: string;
  promptVersion: string;
  system: string;
  user: string;
  context: string;
  signal?: Readonly<{ aborted: boolean }>;
}>;
export type AiGenerationResponse<T> = Readonly<{
  output: T;
  providerRequestId: string;
  model: string;
  latencyMs: number;
}>;

export interface StructuredAiProvider {
  generate<T>(
    request: AiGenerationRequest,
    schema: { parse(input: unknown): T },
  ): Promise<AiGenerationResponse<T>>;
}

export async function generateRecommendation(
  provider: StructuredAiProvider,
  request: AiGenerationRequest,
): Promise<AiGenerationResponse<RecommendationOutput>> {
  try {
    return await provider.generate(request, recommendationOutputSchema);
  } catch (error) {
    if (error instanceof AiPolicyError) throw error;
    throw new AiPolicyError(
      "PROVIDER_UNAVAILABLE",
      "AI provider failed to produce a valid structured response",
    );
  }
}
