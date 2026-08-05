import { describe, expect, it } from "vitest";
import { generateRecommendation } from "@ai-estimate-studio/ai";
import type { AiPolicyError, AiProviderError } from "@ai-estimate-studio/ai";
import {
  JsonStructuredProvider,
  type ProviderTransport,
} from "./json-provider.js";

const validJson = JSON.stringify({
  summary: "Verified",
  suggestions: [],
  warnings: [],
});

function request() {
  return {
    model: "test-model",
    promptVersion: "recommendation.v1",
    system: "Use catalog facts only",
    user: "lower cost",
    context: "catalog facts",
  } as const;
}

describe("JsonStructuredProvider", () => {
  it("requests JSON and validates the response through the AI contract", async () => {
    let responseFormat: string | undefined;
    const transport: ProviderTransport = {
      async complete(input) {
        responseFormat = input.responseFormat;
        return {
          text: validJson,
          requestId: "req-1",
          model: input.model,
        };
      },
    };
    const result = await generateRecommendation(
      new JsonStructuredProvider(transport),
      request(),
    );
    expect(responseFormat).toBe("json");
    expect(result.output.summary).toBe("Verified");
  });

  it("maps malformed and invalid responses to a policy error", async () => {
    const malformed: ProviderTransport = {
      async complete() {
        return { text: "not-json", requestId: "req-2", model: "test" };
      },
    };
    await expect(
      generateRecommendation(new JsonStructuredProvider(malformed), request()),
    ).rejects.toMatchObject<Partial<AiPolicyError>>({ code: "SCHEMA_INVALID" });

    const invalid: ProviderTransport = {
      async complete() {
        return {
          text: JSON.stringify({ summary: 42 }),
          requestId: "req-3",
          model: "test",
        };
      },
    };
    await expect(
      generateRecommendation(new JsonStructuredProvider(invalid), request()),
    ).rejects.toMatchObject({ code: "SCHEMA_INVALID" });
  });

  it("maps rate limits and enforces cost and prompt safety", async () => {
    const limited: ProviderTransport = {
      async complete() {
        throw Object.assign(new Error("busy"), { code: "429" });
      },
    };
    await expect(
      generateRecommendation(new JsonStructuredProvider(limited), request()),
    ).rejects.toMatchObject<Partial<AiProviderError>>({ code: "RATE_LIMITED" });

    const expensive: ProviderTransport = {
      async complete() {
        return {
          text: validJson,
          requestId: "req-4",
          model: "test",
          costMinor: "101",
        };
      },
    };
    await expect(
      generateRecommendation(
        new JsonStructuredProvider(expensive, { maxCostMinor: 100n }),
        request(),
      ),
    ).rejects.toMatchObject<Partial<AiProviderError>>({ code: "COST_LIMIT" });

    const unsafe: ProviderTransport = {
      async complete() {
        throw new Error("must not call");
      },
    };
    await expect(
      generateRecommendation(new JsonStructuredProvider(unsafe), {
        ...request(),
        user: "ada@example.test",
      }),
    ).rejects.toMatchObject({ code: "PII_REJECTED" });
  });
});
