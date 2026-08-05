import type { CustomerId, OrganizationId } from "../shared/ids.js";
import type { Locale } from "../shared/locale.js";
import type { Version } from "../shared/revision.js";

export type Customer = Readonly<{
  id: CustomerId;
  organizationId: OrganizationId;
  email: string;
  name?: string;
  phone?: string;
  locale: Locale;
  version: Version;
}>;
