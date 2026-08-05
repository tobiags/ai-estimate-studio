import {
  generateRecommendation,
  type AiGenerationResponse,
  type PromptRegistry,
  type RecommendationOutput,
  type RecommendationRecalculator,
  type RecommendationVerificationIssue,
  type RecommendationVerificationResult,
  type StructuredAiProvider,
  verifyRecommendation,
} from "@ai-estimate-studio/ai";
import type { RecomputedRecommendationPrice } from "@ai-estimate-studio/ai";
import type { AiContextApplicationService } from "./context-service.js";

export type RecommendationScope = Readonly<{ organizationId: string }>;
type VerifiedRecommendationOutput = RecommendationVerificationResult["output"];

export type RecommendationGenerationInput = Readonly<{
  configurationId: string;
  revisionId: string;
  locale: string;
  model: string;
  promptVersion: string;
  goal?: string;
}>;

export interface RecommendationPricingVerifier {
  recompute(
    scope: RecommendationScope,
    configurationId: string,
    input: Readonly<{
      addOptionIds: readonly string[];
      removeOptionIds: readonly string[];
    }>,
  ): Promise<RecomputedRecommendationPrice>;
}

export type RecommendationRecord = Readonly<{
  id: string;
  organizationId: string;
  configurationId: string;
  revisionId: string;
  status: "VERIFIED";
  promptVersion: string;
  model: string;
  locale: string;
  contextChecksum: string;
  providerRequestId: string;
  output: VerifiedRecommendationOutput;
  verification: readonly RecommendationVerificationIssue[];
}>;

export interface RecommendationStore {
  save(
    scope: RecommendationScope,
    input: Readonly<
      Omit<RecommendationRecord, "id" | "organizationId" | "status">
    >,
  ): Promise<RecommendationRecord>;
}

export type RecommendationGenerationResult = Readonly<{
  status: "VERIFIED" | "REJECTED";
  output: VerifiedRecommendationOutput;
  issues: readonly RecommendationVerificationIssue[];
  record?: RecommendationRecord;
  provider: AiGenerationResponse<RecommendationOutput>;
}>;

export class RecommendationApplicationError extends Error {
  constructor(
    readonly code: "REJECTED" | "CONFLICT",
    message: string,
  ) {
    super(message);
    this.name = "RecommendationApplicationError";
  }
}

/** Generates, verifies and persists only authoritative recommendation output. */
export class RecommendationApplicationService {
  constructor(
    private readonly context: AiContextApplicationService,
    private readonly prompts: PromptRegistry,
    private readonly provider: StructuredAiProvider,
    private readonly pricing: RecommendationPricingVerifier,
    private readonly store: RecommendationStore,
  ) {}

  async generate(
    scope: RecommendationScope,
    input: RecommendationGenerationInput,
  ): Promise<RecommendationGenerationResult> {
    const context = await this.context.build(scope, {
      revisionId: input.revisionId,
      locale: input.locale,
      ...(input.goal === undefined ? {} : { goal: input.goal }),
    });
    const prompt = this.prompts.render(input.promptVersion, context.text);
    const provider = await generateRecommendation(this.provider, {
      model: input.model,
      promptVersion: prompt.version,
      system: prompt.system,
      user: prompt.user,
      context: prompt.context,
    });
    const recalculate: RecommendationRecalculator = (changes) =>
      this.pricing.recompute(scope, input.configurationId, changes);
    const verification = await verifyRecommendation(
      provider.output,
      context.entities,
      recalculate,
    );
    if (verification.output.suggestions.length === 0) {
      return Object.freeze({
        status: "REJECTED" as const,
        output: verification.output,
        issues: verification.issues,
        provider,
      });
    }
    const record = await this.store.save(scope, {
      configurationId: input.configurationId,
      revisionId: input.revisionId,
      promptVersion: input.promptVersion,
      model: provider.model,
      locale: input.locale,
      contextChecksum: context.checksum,
      providerRequestId: provider.providerRequestId,
      output: verification.output,
      verification: verification.issues,
    });
    return Object.freeze({
      status: "VERIFIED" as const,
      output: verification.output,
      issues: verification.issues,
      record,
      provider,
    });
  }
}
