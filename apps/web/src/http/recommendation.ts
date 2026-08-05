import {
  AiPolicyError,
  AiProviderError,
  type RecommendationGenerationResult,
  type RecommendationScope,
} from "@ai-estimate-studio/application";
import {
  recommendationRequestSchema,
  uuidSchema,
  type RecommendationRequest,
} from "@ai-estimate-studio/contracts";
import { isResponse, readJson, safeRoute } from "./route";
import { problemResponse } from "./problems";

export type RecommendationRouteDependencies = Readonly<{
  service: Readonly<{
    generate(
      scope: RecommendationScope,
      input: Readonly<{
        configurationId: string;
        revisionId: string;
        locale: string;
        model: string;
        promptVersion: string;
        goal?: string;
      }>,
    ): Promise<RecommendationGenerationResult>;
  }>;
  resolveScope(request: Request): Promise<RecommendationScope>;
  resolveRevisionId(
    scope: RecommendationScope,
    configurationId: string,
  ): Promise<string>;
  resolveLocale(
    scope: RecommendationScope,
    configurationId: string,
    requestedLocale: string | undefined,
  ): Promise<string>;
  model: string;
  promptVersion: string;
  now?: () => string;
}>;

function providerProblem(error: AiPolicyError | AiProviderError): Response {
  if (error instanceof AiPolicyError)
    return problemResponse({
      title: "Recommendation request rejected",
      status: 422,
      type: `https://ai-estimate-studio.dev/problems/ai-${error.code.toLowerCase()}`,
    });
  if (error.code === "RATE_LIMITED")
    return problemResponse({
      title: "Recommendation rate limit",
      status: 429,
      type: "https://ai-estimate-studio.dev/problems/ai-rate-limited",
    });
  if (error.code === "ABORTED")
    return problemResponse({
      title: "Recommendation request cancelled",
      status: 408,
      type: "https://ai-estimate-studio.dev/problems/ai-aborted",
    });
  return problemResponse({
    title: "Recommendation provider unavailable",
    status: 503,
    type: "https://ai-estimate-studio.dev/problems/ai-provider-unavailable",
  });
}

export function createRecommendationPostHandler(
  dependencies: RecommendationRouteDependencies,
): (request: Request, configurationId: string) => Promise<Response> {
  return (request, configurationId) =>
    safeRoute(async () => {
      if (!uuidSchema.safeParse(configurationId).success)
        return problemResponse({
          title: "Invalid configuration ID",
          status: 422,
          type: "https://ai-estimate-studio.dev/problems/invalid-configuration-id",
        });
      const parsed = await readJson<RecommendationRequest>(
        request,
        recommendationRequestSchema,
      );
      if (isResponse(parsed)) return parsed;
      const scope = await dependencies.resolveScope(request);
      const locale = await dependencies.resolveLocale(
        scope,
        configurationId,
        parsed.locale,
      );
      const revisionId = await dependencies.resolveRevisionId(
        scope,
        configurationId,
      );
      let result: RecommendationGenerationResult;
      try {
        result = await dependencies.service.generate(scope, {
          configurationId,
          revisionId,
          locale,
          model: dependencies.model,
          promptVersion: dependencies.promptVersion,
          ...(parsed.goal === undefined ? {} : { goal: parsed.goal }),
        });
      } catch (error) {
        if (error instanceof AiPolicyError || error instanceof AiProviderError)
          return providerProblem(error);
        throw error;
      }
      if (result.status === "REJECTED")
        return problemResponse({
          title: "No verified recommendations",
          status: 422,
          type: "https://ai-estimate-studio.dev/problems/ai-verification-failed",
        });
      const record = result.record;
      if (!record) throw new Error("Verified recommendation has no record");
      return Response.json(
        {
          id: record.id,
          status: "VERIFIED",
          promptVersion: record.promptVersion,
          locale: record.locale,
          summary: result.output.summary,
          suggestions: result.output.suggestions,
          warnings: [
            ...result.output.warnings,
            ...(result.issues.length > 0
              ? ["Some suggestions were omitted after verification."]
              : []),
          ],
          createdAt: dependencies.now?.() ?? new Date().toISOString(),
        },
        { headers: { "cache-control": "no-store" } },
      );
    });
}
