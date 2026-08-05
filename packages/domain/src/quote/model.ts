import type {
  ConfigurationId,
  CustomerId,
  OrganizationId,
  ProductRevisionId,
  QuoteId,
  QuoteLineId,
} from "../shared/ids.js";
import type { LocalizedText } from "../shared/locale.js";
import type { Money } from "../shared/money.js";
import type { Version } from "../shared/revision.js";
import type { QuoteStatus } from "../state-machines.js";

export const quoteLineKinds = [
  "BASE",
  "OPTION",
  "DIMENSION",
  "LABOUR",
  "DELIVERY",
  "DISCOUNT",
  "TAX",
  "FEE",
] as const;
export type QuoteLineKind = (typeof quoteLineKinds)[number];

export type QuoteLine = Readonly<{
  id: QuoteLineId;
  quoteId: QuoteId;
  order: number;
  code: string;
  kind: QuoteLineKind;
  label: LocalizedText;
  quantity: string;
  unitAmount: Money;
  netAmount: Money;
  taxAmount: Money;
  totalAmount: Money;
  taxClass?: string;
  sourceRuleId?: string;
}>;

export type Quote = Readonly<{
  id: QuoteId;
  organizationId: OrganizationId;
  customerId: CustomerId;
  configurationId: ConfigurationId;
  productRevisionId: ProductRevisionId;
  quoteNumber: string;
  status: QuoteStatus;
  subtotal: Money;
  taxTotal: Money;
  total: Money;
  issuedAt?: string;
  expiresAt: string;
  version: Version;
}>;
