import { describe, expect, it } from "vitest";
import {
  PromptRegistry,
  type ContextEntity,
  type StructuredAiProvider,
} from "@ai-estimate-studio/ai";
import {
  AiContextApplicationService,
  type AiContextEntityStore,
} from "./context-service.js";
import {
  RecommendationApplicationService,
  type RecommendationPricingVerifier,
  type RecommendationRecord,
  type RecommendationStore,
} from "./recommendation-service.js";

const entities: readonly ContextEntity[] = [
  {
    entityType: "OPTION",
    entityId: "option-premium",
    revisionId: "revision-a",
    label: "Premium",
  },
];

function provider(output: unknown): StructuredAiProvider {
  return {
    async generate() {
      return {
        output,
        providerRequestId: "provider-request-1",
        model: "test-model",
        latencyMs: 2,
      } as never;
    },
  };
}

function setup(output: unknown) {
  const contextStore: AiContextEntityStore = {
    async listForRevision() {
      return entities;
    },
  };
  const prompts = new PromptRegistry();
  prompts.register({
    version: "recommendation.v1",
    system: "Use only catalog_context.",
    renderUser: (context) => context,
  });
  const pricingCalls: string[] = [];
  const pricing: RecommendationPricingVerifier = {
    async recompute(scope, configurationId) {
      pricingCalls.push(`${scope.organizationId}:${configurationId}`);
      return { valid: true, deltaMinor: "300", currency: "EUR" };
    },
  };
  const saved: RecommendationRecord[] = [];
  const store: RecommendationStore = {
    async save(scope, input) {
      const record = {
        ...input,
        id: "recommendation-1",
        organizationId: scope.organizationId,
        status: "VERIFIED" as const,
      };
      saved.push(record);
      return record;
    },
  };
  const service = new RecommendationApplicationService(
    new AiContextApplicationService(contextStore),
    prompts,
    provider(output),
    pricing,
    store,
  );
  return { service, pricingCalls, saved };
}

const validOutput = {
  summary: "Premium option",
  suggestions: [
    {
      kind: "PREMIUM_UPGRADE",
      title: "Premium",
      rationale: "More capability",
      addOptionIds: ["option-premium"],
      removeOptionIds: [],
      verifiedDeltaMinor: "300",
      currency: "EUR",
      citations: [{ entityType: "OPTION", entityId: "option-premium" }],
    },
  ],
  warnings: [],
};

describe("RecommendationApplicationService", () => {
  it("passes tenant and configuration scope to pricing and persists verified output", async () => {
    const { service, pricingCalls, saved } = setup(validOutput);
    const result = await service.generate(
      { organizationId: "org-a" },
      {
        configurationId: "configuration-a",
        revisionId: "revision-a",
        locale: "en",
        model: "test-model",
        promptVersion: "recommendation.v1",
      },
    );
    expect(result.status).toBe("VERIFIED");
    expect(result.record?.status).toBe("VERIFIED");
    expect(pricingCalls).toEqual(["org-a:configuration-a"]);
    expect(saved).toHaveLength(1);
    expect(saved[0]?.contextChecksum).toContain("revision-a");
  });

  it("does not persist hallucinated references", async () => {
    const { service, saved } = setup({
      ...validOutput,
      suggestions: [
        {
          ...validOutput.suggestions[0],
          addOptionIds: ["invented-option"],
          citations: [{ entityType: "OPTION", entityId: "invented-option" }],
        },
      ],
    });
    const result = await service.generate(
      { organizationId: "org-a" },
      {
        configurationId: "configuration-a",
        revisionId: "revision-a",
        locale: "en",
        model: "test-model",
        promptVersion: "recommendation.v1",
      },
    );
    expect(result.status).toBe("REJECTED");
    expect(result.record).toBeUndefined();
    expect(result.issues[0]?.code).toBe("UNKNOWN_ENTITY");
    expect(saved).toHaveLength(0);
  });
});
