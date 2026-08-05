import { describe, expect, it, vi } from "vitest";
import { PricingApplicationError } from "@ai-estimate-studio/application";
import type { PricingRuleSetDocument } from "@ai-estimate-studio/application";
import {
  createPricingHandlers,
  type PricingRouteDependencies,
} from "./pricing";

const ruleSetId = "00000000-0000-4000-8000-000000000001";

const document: PricingRuleSetDocument = {
  id: ruleSetId,
  organizationId: "org-a",
  productRevisionId: "revision-a",
  revision: 1,
  version: 1,
  state: "DRAFT",
  schemaVersion: 1,
  currency: "EUR",
  checksum: "checksum",
  effectiveFrom: null,
  effectiveUntil: null,
  rules: [],
};

function dependencies(): PricingRouteDependencies {
  const find = vi.fn(async () => document);
  const updateDraft = vi.fn(async () => document);
  const simulate = vi.fn(async () => ({ price: {}, violations: [] }) as never);
  const publish = vi.fn(
    async () => ({ ...document, state: "PUBLISHED" }) as never,
  );
  return {
    repository: { find },
    service: { updateDraft, simulate, publish },
    resolveScope: async () => ({ organizationId: "org-a" }),
    assertCsrf: async () => undefined,
  };
}

function request(body: unknown) {
  return new Request("https://example.test", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": "0123456789abcdef",
    },
    body: JSON.stringify(body),
  });
}

describe("pricing HTTP handlers", () => {
  it("reads, updates and simulates through scoped application ports", async () => {
    const deps = dependencies();
    const handlers = createPricingHandlers(deps);
    expect(
      (await handlers.get(new Request("https://example.test"), ruleSetId))
        .status,
    ).toBe(200);
    expect(
      (
        await handlers.patch(
          request({
            version: 1,
            schemaVersion: 1,
            currency: "EUR",
            rules: [],
            validation: {
              revisionId: "revision-a",
              groups: [],
              options: [],
              dependencies: [],
              dimensions: [],
              rules: [],
            },
          }),
          ruleSetId,
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await handlers.simulate(
          request({
            name: "base",
            facts: {
              optionIds: [],
              dimensions: [],
              evaluationTimestamp: "2026-08-05T00:00:00.000Z",
            },
          }),
          ruleSetId,
        )
      ).status,
    ).toBe(200);
  });

  it("maps optimistic conflicts and protects write handlers with CSRF dependency", async () => {
    const deps = dependencies();
    const csrf = vi.fn(async () => undefined);
    const response = await createPricingHandlers({
      ...deps,
      service: {
        ...deps.service,
        updateDraft: vi.fn(async () => {
          throw new PricingApplicationError("CONFLICT", "stale");
        }),
      },
      assertCsrf: csrf,
    }).patch(
      request({
        version: 1,
        schemaVersion: 1,
        currency: "EUR",
        rules: [],
        validation: {},
      }),
      ruleSetId,
    );
    expect(response.status).toBe(409);
    expect(csrf).toHaveBeenCalledTimes(1);
  });

  it("publishes only after a validated publication request", async () => {
    const handlers = createPricingHandlers(dependencies());
    const response = await handlers.publish(
      request({
        version: 1,
        effectiveFrom: "2026-08-05T00:00:00.000Z",
        effectiveUntil: null,
        scenarios: [],
      }),
      ruleSetId,
    );
    expect(response.status).toBe(200);
  });
});
