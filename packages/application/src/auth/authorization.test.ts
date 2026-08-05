import { describe, expect, it } from "vitest";
import {
  AuthorizationService,
  type MembershipLookup,
} from "./authorization.js";

describe("application authorization service", () => {
  it("fails closed when membership or organization is unavailable", async () => {
    const lookup: MembershipLookup = {
      findActiveMembership: async () => null,
      isOrganizationActive: async () => true,
    };
    const service = new AuthorizationService(lookup);

    await expect(
      service.require({
        userId: "user",
        organizationId: "organization",
        permission: "quotes.read",
      }),
    ).rejects.toThrow("Authorization denied");
  });

  it("authorizes only an active, same-organization membership", async () => {
    const lookup: MembershipLookup = {
      findActiveMembership: async () => ({
        organizationId: "org",
        role: "SALES",
      }),
      isOrganizationActive: async () => true,
    };
    const service = new AuthorizationService(lookup);

    await expect(
      service.require({
        userId: "user",
        organizationId: "org",
        permission: "quotes.read",
      }),
    ).resolves.toMatchObject({ role: "SALES" });
    await expect(
      service.require({
        userId: "user",
        organizationId: "org",
        permission: "catalog.publish",
      }),
    ).rejects.toThrow("Authorization denied");
  });
});
