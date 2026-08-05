import {
  can,
  type MembershipRole,
  type Permission,
} from "@ai-estimate-studio/domain";

export type MembershipLookup = Readonly<{
  findActiveMembership(
    userId: string,
    organizationId: string,
  ): Promise<Readonly<{ organizationId: string; role: MembershipRole }> | null>;
  isOrganizationActive(organizationId: string): Promise<boolean>;
}>;

export type AuthorizationRequest = Readonly<{
  userId: string;
  organizationId: string;
  permission: Permission;
}>;

export class AuthorizationDeniedError extends Error {
  readonly code = "AUTHORIZATION_DENIED" as const;

  constructor(message = "Authorization denied") {
    super(message);
    this.name = "AuthorizationDeniedError";
  }
}

export class AuthorizationService {
  constructor(private readonly lookup: MembershipLookup) {}

  async require(
    request: AuthorizationRequest,
  ): Promise<Readonly<{ organizationId: string; role: MembershipRole }>> {
    const membership = await this.lookup.findActiveMembership(
      request.userId,
      request.organizationId,
    );
    if (
      !membership ||
      membership.organizationId !== request.organizationId ||
      !(await this.lookup.isOrganizationActive(request.organizationId)) ||
      !can(membership.role, request.permission)
    ) {
      throw new AuthorizationDeniedError();
    }
    return membership;
  }
}
