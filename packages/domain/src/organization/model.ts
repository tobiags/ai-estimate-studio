import type { Locale } from "../shared/locale.js";
import type { OrganizationId, UserId, MembershipId } from "../shared/ids.js";
import type { CurrencyCode } from "../shared/money.js";
import type { Version } from "../shared/revision.js";
import type {
  MembershipRole,
  MembershipStatus,
  OrganizationStatus,
} from "../state-machines.js";

export type Organization = Readonly<{
  id: OrganizationId;
  slug: string;
  canonicalHost: string;
  legalName: string;
  displayName: string;
  defaultLocale: Locale;
  supportedLocales: readonly Locale[];
  timezone: string;
  currency: CurrencyCode;
  quoteValidityDays: number;
  taxInclusive: boolean;
  status: OrganizationStatus;
  version: Version;
}>;

export type Membership = Readonly<{
  id: MembershipId;
  organizationId: OrganizationId;
  userId: UserId;
  role: MembershipRole;
  status: MembershipStatus;
  version: Version;
}>;
