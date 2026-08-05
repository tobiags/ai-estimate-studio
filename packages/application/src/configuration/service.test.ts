import { describe, expect, it } from "vitest";
import {
  ConfigurationApplicationError,
  ConfigurationApplicationService,
  hashConfigurationSession,
} from "./service";
import type {
  AuthoritativeConfiguration,
  ConfigurationSelection,
  ConfigurationStore,
} from "./types";

const selection: ConfigurationSelection = {
  variantId: "variant-1",
  optionIds: [],
  dimensions: [],
  locale: "en",
};
const price = { totalMinor: "1000", currency: "EUR", lines: [] };

class FakeStore implements ConfigurationStore {
  value: AuthoritativeConfiguration | undefined;
  tokenHash = "";
  async create(
    scope: Readonly<{ organizationId: string }>,
    input: Readonly<{
      id: string;
      productRevisionId: string;
      pricingRuleSetId: string;
      selection: ConfigurationSelection;
      sessionTokenHash: string;
      expiresAt: string;
      price: AuthoritativeConfiguration["price"];
    }>,
  ): Promise<AuthoritativeConfiguration> {
    this.tokenHash = input.sessionTokenHash;
    this.value = {
      id: input.id,
      organizationId: scope.organizationId,
      productRevisionId: input.productRevisionId,
      pricingRuleSetId: input.pricingRuleSetId,
      version: 1,
      selection: input.selection,
      price: input.price,
      expiresAt: input.expiresAt,
    };
    return this.value;
  }
  async find(
    scope: Readonly<{ organizationId: string }>,
    id: string,
  ): Promise<AuthoritativeConfiguration | null> {
    return this.value?.organizationId === scope.organizationId &&
      this.value.id === id
      ? this.value
      : null;
  }
  async update(
    scope: Readonly<{ organizationId: string }>,
    id: string,
    expectedVersion: number,
    input: Readonly<{
      selection: ConfigurationSelection;
      price: AuthoritativeConfiguration["price"];
    }>,
  ): Promise<AuthoritativeConfiguration> {
    if (
      !this.value ||
      this.value.organizationId !== scope.organizationId ||
      this.value.id !== id
    )
      throw new ConfigurationApplicationError("NOT_FOUND", "missing");
    if (expectedVersion !== this.value.version)
      throw new ConfigurationApplicationError("CONFLICT", "stale");
    this.value = {
      ...this.value,
      version: this.value.version + 1,
      selection: input.selection,
      price: input.price,
    };
    return this.value;
  }
  async sessionHash(
    scope: Readonly<{ organizationId: string }>,
    id: string,
  ): Promise<string | null> {
    return this.value?.organizationId === scope.organizationId &&
      this.value.id === id
      ? this.tokenHash
      : null;
  }
}

describe("configuration application service", () => {
  it("creates, normalizes, prices and session-binds a configuration", async () => {
    const store = new FakeStore();
    const service = new ConfigurationApplicationService(
      store,
      { normalizeAndPrice: async (input) => ({ selection: input, price }) },
      { now: () => "2026-08-05T00:00:00.000Z" },
      { next: () => "configuration-1" },
    );
    const created = await service.create(
      { organizationId: "org-1" },
      {
        productRevisionId: "revision-1",
        pricingRuleSetId: "rules-1",
        selection,
        sessionToken: "secret-token",
      },
    );
    expect(created.version).toBe(1);
    expect(
      await service.get(
        { organizationId: "org-1" },
        created.id,
        "secret-token",
      ),
    ).toEqual(created);
    expect(hashConfigurationSession("secret-token")).toBe(store.tokenHash);
  });

  it("rejects wrong tenant, wrong token, expiry and stale version", async () => {
    const store = new FakeStore();
    let now = "2026-08-05T00:00:00.000Z";
    const service = new ConfigurationApplicationService(
      store,
      { normalizeAndPrice: async (input) => ({ selection: input, price }) },
      { now: () => now },
      { next: () => "configuration-1" },
    );
    const created = await service.create(
      { organizationId: "org-1" },
      {
        productRevisionId: "revision-1",
        pricingRuleSetId: "rules-1",
        selection,
        sessionToken: "secret-token",
      },
    );
    await expect(
      service.get({ organizationId: "org-2" }, created.id, "secret-token"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      service.get({ organizationId: "org-1" }, created.id, "wrong-token"),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    now = "2026-08-05T01:00:00.000Z";
    await expect(
      service.get({ organizationId: "org-1" }, created.id, "secret-token"),
    ).rejects.toMatchObject({ code: "EXPIRED" });
    now = "2026-08-05T00:00:00.000Z";
    const longLived = new ConfigurationApplicationService(
      store,
      { normalizeAndPrice: async (input) => ({ selection: input, price }) },
      { now: () => "2026-08-05T00:00:00.000Z" },
      { next: () => "configuration-2" },
    );
    const second = await longLived.create(
      { organizationId: "org-1" },
      {
        productRevisionId: "revision-1",
        pricingRuleSetId: "rules-1",
        selection,
        sessionToken: "secret-token",
      },
    );
    await expect(
      longLived.update(
        { organizationId: "org-1" },
        second.id,
        "secret-token",
        99,
        selection,
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
