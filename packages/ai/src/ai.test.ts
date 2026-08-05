import { describe, expect, it } from "vitest";
import {
  AiPolicyError,
  PromptRegistry,
  assertSafeAiInput,
  generateRecommendation,
} from "./index";

describe("provider-neutral grounded AI boundary", () => {
  it("rejects contact PII and oversized contexts before provider calls", () => {
    expect(() =>
      assertSafeAiInput({
        system: "safe",
        user: "ada@example.test",
        context: "",
      }),
    ).toThrowError(AiPolicyError);
    expect(() =>
      assertSafeAiInput({
        system: "safe",
        user: "safe",
        context: "x".repeat(25_000),
      }),
    ).toThrow("budget");
  });

  it("renders versioned prompts and rejects unknown versions", () => {
    const registry = new PromptRegistry();
    registry.register({
      version: "recommendation.v1",
      system: "Use only supplied facts.",
      renderUser: (context, goal) =>
        `Goal: ${goal ?? "none"}\nContext: ${context}`,
    });
    expect(
      registry.render("recommendation.v1", "price=100", "lower budget").version,
    ).toBe("recommendation.v1");
    expect(() => registry.render("recommendation.v2", "facts")).toThrow(
      "Unknown",
    );
  });

  it("validates structured output through the same fake-provider contract", async () => {
    const provider = {
      generate: async (
        _request: unknown,
        schema: { parse(value: unknown): unknown },
      ) => ({
        output: schema.parse({
          summary: "Use the verified option",
          suggestions: [],
          warnings: [],
        }),
        providerRequestId: "req-1",
        model: "fake",
        latencyMs: 1,
      }),
    };
    const result = await generateRecommendation(provider, {
      model: "fake",
      promptVersion: "v1",
      system: "safe",
      user: "safe",
      context: "safe",
    });
    expect(result.output.summary).toContain("verified");
    const badProvider = {
      generate: async (
        _request: unknown,
        schema: { parse(value: unknown): unknown },
      ) => ({
        output: schema.parse({ summary: 123 }),
        providerRequestId: "req-2",
        model: "fake",
        latencyMs: 1,
      }),
    };
    await expect(
      generateRecommendation(badProvider, {
        model: "fake",
        promptVersion: "v1",
        system: "safe",
        user: "safe",
        context: "safe",
      }),
    ).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
  });
});
