import { describe, expect, it } from "vitest";
import { AiProviderError } from "@ai-estimate-studio/application";
import {
  createRecommendationPostHandler,
  type RecommendationRouteDependencies,
} from "./recommendation";

const configurationId = "00000000-0000-4000-8000-000000000001";

function dependencies(
  result: RecommendationRouteDependencies["service"],
): RecommendationRouteDependencies {
  return {
    service: result,
    resolveScope: async () => ({ organizationId: "org-a" }),
    resolveRevisionId: async () => "revision-a",
    resolveLocale: async (_scope, _configurationId, locale) => locale ?? "en",
    model: "test-model",
    promptVersion: "recommendation.v1",
    now: () => "2026-08-05T00:00:00.000Z",
  };
}

describe("recommendation HTTP handler", () => {
  it("returns only verified public output", async () => {
    const handler = createRecommendationPostHandler(
      dependencies({
        async generate(scope, input) {
          return {
            status: "VERIFIED",
            output: { summary: "Verified", suggestions: [], warnings: [] },
            issues: [],
            provider: {
              output: { summary: "Verified", suggestions: [], warnings: [] },
              providerRequestId: "provider-1",
              model: input.model,
              latencyMs: 1,
            },
            record: {
              id: "00000000-0000-4000-8000-000000000002",
              organizationId: scope.organizationId,
              configurationId: input.configurationId,
              revisionId: input.revisionId,
              status: "VERIFIED",
              promptVersion: input.promptVersion,
              model: input.model,
              locale: input.locale,
              contextChecksum: "checksum",
              providerRequestId: "provider-1",
              output: { summary: "Verified", suggestions: [], warnings: [] },
              verification: [],
            },
          };
        },
      }),
    );
    const response = await handler(
      new Request("https://example.test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ goal: "lower cost", locale: "fr" }),
      }),
      configurationId,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: "VERIFIED",
      locale: "fr",
      summary: "Verified",
    });
  });

  it("maps provider limits and rejected verification to safe problems", async () => {
    const limited = createRecommendationPostHandler(
      dependencies({
        async generate() {
          throw new AiProviderError("RATE_LIMITED", "busy");
        },
      }),
    );
    const limitedResponse = await limited(
      new Request("https://example.test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      }),
      configurationId,
    );
    expect(limitedResponse.status).toBe(429);

    const rejected = createRecommendationPostHandler(
      dependencies({
        async generate() {
          return {
            status: "REJECTED",
            output: { summary: "No", suggestions: [], warnings: [] },
            issues: [
              {
                index: 0,
                code: "UNKNOWN_ENTITY",
                message: "hidden detail",
              },
            ],
            provider: {
              output: { summary: "No", suggestions: [], warnings: [] },
              providerRequestId: "provider-2",
              model: "test-model",
              latencyMs: 1,
            },
          };
        },
      }),
    );
    const rejectedResponse = await rejected(
      new Request("https://example.test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      }),
      configurationId,
    );
    expect(rejectedResponse.status).toBe(422);
    expect(await rejectedResponse.text()).not.toContain("hidden detail");
  });
});
