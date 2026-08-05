import type { AuditEventId, OrganizationId, UserId } from "../shared/ids.js";

export type AuditEvent = Readonly<{
  id: AuditEventId;
  organizationId: OrganizationId;
  actorUserId?: UserId;
  action: string;
  resourceType: string;
  resourceId: string;
  correlationId: string;
  occurredAt: string;
  before?: Readonly<Record<string, unknown>>;
  after?: Readonly<Record<string, unknown>>;
}>;
