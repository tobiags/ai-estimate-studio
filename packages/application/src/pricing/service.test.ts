import { describe, expect, it } from "vitest";
import {
  PricingApplicationError,
  PricingApplicationService,
  type PricingRepository,
  type PricingRuleSetDocument,
} from "../index";

const rule = {
  id: "00000000-0000-4000-8000-000000000001",
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
    amountMinor: "1000",
  },
};

const current: PricingRuleSetDocument = {
  id: "rule-set-1",
  organizationId: "org-1",
  productRevisionId: "revision-1",
  revision: 1,
  version: 1,
  state: "DRAFT",
  schemaVersion: 1,
  currency: "EUR",
  checksum: "old",
  rules: [rule],
};

class FakeRepository implements PricingRepository {
  saved: PricingRuleSetDocument | undefined;
  published: boolean = false;

  async find(): Promise<PricingRuleSetDocument | null> {
    return this.saved ?? current;
  }
  async saveDraft(
    _scope: Readonly<{ organizationId: string }>,
    document: PricingRuleSetDocument,
    expectedVersion: number,
  ): Promise<PricingRuleSetDocument> {
    if (expectedVersion !== current.version)
      throw new PricingApplicationError("CONFLICT", "stale");
    this.saved = document;
    return document;
  }
  async publish(
    _scope: Readonly<{ organizationId: string }>,
    _id: string,
    expectedVersion: number,
    effectiveFrom: string,
    effectiveUntil: string | null,
  ): Promise<PricingRuleSetDocument> {
    if (expectedVersion !== (this.saved ?? current).version)
      throw new PricingApplicationError("CONFLICT", "stale");
    this.published = true;
    return {
      ...(this.saved ?? current),
      state: "PUBLISHED",
      effectiveFrom,
      effectiveUntil,
    };
  }
}

describe("pricing application service", () => {
  it("updates a validated draft and records an audit event", async () => {
    const repository = new FakeRepository();
    const audit: string[] = [];
    const service = new PricingApplicationService(repository, {
      append: async (event) => audit.push(event.action),
    });
    const updated = await service.updateDraft(
      { organizationId: "org-1" },
      current,
      {
        schemaVersion: 1,
        currency: "EUR",
        rules: [rule],
        validation: {
          revisionId: "revision-1",
          groups: [],
          options: [],
          dependencies: [],
          dimensions: [],
          rules: [rule],
        },
      },
    );
    expect(updated.version).toBe(2);
    expect(updated.state).toBe("DRAFT");
    expect(audit).toEqual(["PRICING_DRAFT_UPDATED"]);
  });

  it("simulates deterministic prices and blocks invalid publication intervals", async () => {
    const service = new PricingApplicationService(new FakeRepository(), {
      append: async () => undefined,
    });
    const simulation = await service.simulate(current, {
      name: "default",
      facts: {
        variantId: "variant-1",
        optionIds: [],
        dimensions: {},
        evaluationTimestamp: "2026-08-05T00:00:00Z",
      },
    });
    expect(simulation.price.totalMinor).toBe("1000");
    await expect(
      service.publish(
        { organizationId: "org-1" },
        current,
        [],
        "2026-08-06T00:00:00Z",
        "2026-08-05T00:00:00Z",
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("denies cross-organization draft writes", async () => {
    const service = new PricingApplicationService(new FakeRepository(), {
      append: async () => undefined,
    });
    await expect(
      service.updateDraft({ organizationId: "org-2" }, current, {
        schemaVersion: 1,
        currency: "EUR",
        rules: [rule],
        validation: {
          revisionId: "revision-1",
          groups: [],
          options: [],
          dependencies: [],
          dimensions: [],
          rules: [rule],
        },
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
