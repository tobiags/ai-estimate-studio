import { describe, expect, it, vi } from "vitest";
import { PrismaPricingRepository } from "./pricing.js";

const ruleId = "00000000-0000-4000-8000-000000000001";
const ruleSetId = "00000000-0000-4000-8000-000000000002";
const revisionId = "00000000-0000-4000-8000-000000000003";
const organizationId = "00000000-0000-4000-8000-000000000004";

function row(version = 1) {
  return {
    id: ruleSetId,
    productRevisionId: revisionId,
    revision: 1,
    state: "DRAFT" as const,
    schemaVersion: 1,
    currency: "EUR",
    effectiveFrom: null,
    effectiveUntil: null,
    checksum: "checksum",
    publishedAt: null,
    version,
    productRevision: { product: { organizationId } },
    rules: [
      {
        id: ruleId,
        pricingRuleSetId: ruleSetId,
        code: "BASE",
        kind: "BASE" as const,
        priority: 1,
        label: "Base",
        condition: { exists: { fact: "variantId" } },
        action: {
          type: "ADD_LINE" as const,
          code: "BASE",
          kind: "BASE" as const,
          label: "Base",
          amountMinor: "100",
        },
        stackGroup: null,
        exclusiveInGroup: false,
        taxClass: null,
      },
    ],
  };
}

function fakeClient(initial = row()) {
  const client = {
    pricingRuleSet: {
      findFirst: vi.fn().mockResolvedValue(initial),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    pricingRule: {
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    $transaction: vi.fn(async (work: (tx: typeof client) => unknown) =>
      work(client),
    ),
  };
  return client;
}

describe("PrismaPricingRepository", () => {
  it("loads only an organization-owned rule set and maps the safe rule document", async () => {
    const client = fakeClient();
    const repository = new PrismaPricingRepository(client as never);
    const document = await repository.find({ organizationId }, ruleSetId);
    expect(document).toMatchObject({
      id: ruleSetId,
      organizationId,
      productRevisionId: revisionId,
      rules: [{ code: "BASE", action: { type: "ADD_LINE" } }],
    });
    expect(client.pricingRuleSet.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: ruleSetId,
          productRevision: { product: { organizationId } },
        },
      }),
    );
  });

  it("replaces draft rules under an optimistic version transaction", async () => {
    const client = fakeClient(row(2));
    const repository = new PrismaPricingRepository(client as never);
    const document = await repository.saveDraft(
      { organizationId },
      {
        id: ruleSetId,
        organizationId,
        productRevisionId: revisionId,
        revision: 1,
        version: 2,
        state: "DRAFT",
        schemaVersion: 1,
        currency: "EUR",
        checksum: "new-checksum",
        effectiveFrom: null,
        effectiveUntil: null,
        rules: [
          {
            id: ruleId,
            code: "BASE",
            kind: "BASE",
            priority: 1,
            label: "Base",
            condition: { exists: { fact: "variantId" } },
            action: {
              type: "ADD_LINE",
              code: "BASE",
              kind: "BASE",
              label: "Base",
              amountMinor: "100",
            },
            exclusiveInGroup: false,
          },
        ],
      },
      1,
    );
    expect(document.version).toBe(2);
    expect(client.pricingRuleSet.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ version: 1 }),
      }),
    );
    expect(client.pricingRule.deleteMany).toHaveBeenCalledWith({
      where: { pricingRuleSetId: ruleSetId },
    });
    expect(client.pricingRule.createMany).toHaveBeenCalledTimes(1);
  });
});
