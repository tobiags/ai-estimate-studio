import { DomainError } from "../shared/errors.js";
import type { MembershipRole } from "../state-machines.js";

export const permissions = [
  "organization.settings",
  "memberships.manage",
  "catalog.edit",
  "catalog.publish",
  "pricing.edit",
  "pricing.publish",
  "quotes.read",
  "quotes.update",
  "customers.read",
  "audit.export",
  "assets.edit",
  "jobs.retry",
] as const;
export type Permission = (typeof permissions)[number];

const rolePermissions: Readonly<Record<MembershipRole, readonly Permission[]>> =
  {
    OWNER: permissions,
    ADMIN: [
      "memberships.manage",
      "catalog.edit",
      "catalog.publish",
      "pricing.edit",
      "pricing.publish",
      "quotes.read",
      "quotes.update",
      "customers.read",
      "audit.export",
      "assets.edit",
      "jobs.retry",
    ],
    CATALOG_EDITOR: [
      "catalog.edit",
      "pricing.edit",
      "quotes.read",
      "customers.read",
      "assets.edit",
    ],
    SALES: ["quotes.read", "quotes.update", "customers.read"],
    VIEWER: ["quotes.read", "customers.read"],
  };

export function can(role: MembershipRole, permission: Permission): boolean {
  return rolePermissions[role].includes(permission);
}

export class AuthorizationDeniedError extends DomainError {
  constructor(role: MembershipRole, permission: Permission) {
    super(
      "AUTHORIZATION_DENIED",
      `Permission denied for ${role}: ${permission}`,
      {
        role,
        permission,
      },
    );
    this.name = "AuthorizationDeniedError";
  }
}

export function assertPermission(
  role: MembershipRole,
  permission: Permission,
): void {
  if (!can(role, permission))
    throw new AuthorizationDeniedError(role, permission);
}

export type MembershipAction =
  "INVITE" | "CHANGE_ROLE" | "SUSPEND" | "REACTIVATE";

export type MembershipManagementDecision = Readonly<{
  actorRole: MembershipRole;
  targetRole: MembershipRole;
  targetStatus: "INVITED" | "ACTIVE" | "SUSPENDED";
  activeOwnerCount: number;
  action: MembershipAction;
}>;

export function canManageMembership(
  input: MembershipManagementDecision,
): boolean {
  if (!can(input.actorRole, "memberships.manage")) return false;
  if (input.activeOwnerCount < 1) return false;
  if (input.actorRole === "ADMIN" && input.targetRole === "OWNER") return false;
  if (
    input.targetRole === "OWNER" &&
    input.activeOwnerCount === 1 &&
    (input.action === "CHANGE_ROLE" || input.action === "SUSPEND")
  ) {
    return false;
  }
  return true;
}
