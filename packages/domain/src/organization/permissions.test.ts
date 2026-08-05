import { describe, expect, it } from "vitest";
import {
  assertPermission,
  can,
  canManageMembership,
  permissions,
  type Permission,
} from "./permissions.js";

describe("organization authorization", () => {
  const matrix: Record<Permission, string[]> = {
    "organization.settings": ["OWNER"],
    "memberships.manage": ["OWNER", "ADMIN"],
    "catalog.edit": ["OWNER", "ADMIN", "CATALOG_EDITOR"],
    "catalog.publish": ["OWNER", "ADMIN"],
    "pricing.edit": ["OWNER", "ADMIN", "CATALOG_EDITOR"],
    "pricing.publish": ["OWNER", "ADMIN"],
    "quotes.read": ["OWNER", "ADMIN", "CATALOG_EDITOR", "SALES", "VIEWER"],
    "quotes.update": ["OWNER", "ADMIN", "SALES"],
    "customers.read": ["OWNER", "ADMIN", "CATALOG_EDITOR", "SALES", "VIEWER"],
    "audit.export": ["OWNER", "ADMIN"],
    "assets.edit": ["OWNER", "ADMIN", "CATALOG_EDITOR"],
    "jobs.retry": ["OWNER", "ADMIN"],
  };

  it("matches the normative role matrix and denies unknown actions", () => {
    for (const [permission, allowedRoles] of Object.entries(matrix) as [
      Permission,
      string[],
    ][]) {
      for (const role of [
        "OWNER",
        "ADMIN",
        "CATALOG_EDITOR",
        "SALES",
        "VIEWER",
      ] as const) {
        expect(can(role, permission)).toBe(allowedRoles.includes(role));
      }
    }
    expect(can("SALES", "organization.settings")).toBe(false);
    expect(() => assertPermission("CATALOG_EDITOR", "catalog.publish")).toThrow(
      "Permission denied",
    );
    expect(permissions).toContain("catalog.edit");
  });

  it("protects the last active owner and self-demotion", () => {
    expect(
      canManageMembership({
        actorRole: "ADMIN",
        targetRole: "VIEWER",
        targetStatus: "ACTIVE",
        activeOwnerCount: 2,
        action: "SUSPEND",
      }),
    ).toBe(true);
    expect(
      canManageMembership({
        actorRole: "ADMIN",
        targetRole: "OWNER",
        targetStatus: "ACTIVE",
        activeOwnerCount: 1,
        action: "SUSPEND",
      }),
    ).toBe(false);
    expect(
      canManageMembership({
        actorRole: "OWNER",
        targetRole: "OWNER",
        targetStatus: "ACTIVE",
        activeOwnerCount: 1,
        action: "CHANGE_ROLE",
      }),
    ).toBe(false);
  });
});
