import type { AsyncJobId, OrganizationId } from "../shared/ids.js";
import type { JobStatus } from "../state-machines.js";

export type AsyncJob = Readonly<{
  id: AsyncJobId;
  organizationId: OrganizationId;
  type: string;
  status: JobStatus;
  deduplicationKey: string;
  attempts: number;
  availableAt: string;
  lockedAt?: string;
  errorCode?: string;
}>;
