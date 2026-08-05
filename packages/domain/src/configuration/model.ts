import type { Locale } from "../shared/locale.js";
import type {
  ConfigurationId,
  ProductOptionId,
  ProductRevisionId,
  ProductVariantId,
  OrganizationId,
  PricingRuleSetId,
} from "../shared/ids.js";
import type { Money } from "../shared/money.js";
import type { Version } from "../shared/revision.js";
import type { ConfigurationStatus } from "../state-machines.js";

export type Configuration = Readonly<{
  id: ConfigurationId;
  organizationId: OrganizationId;
  productRevisionId: ProductRevisionId;
  pricingRuleSetId: PricingRuleSetId;
  selectedVariantId: ProductVariantId;
  locale: Locale;
  status: ConfigurationStatus;
  budget?: Money;
  version: Version;
  expiresAt: string;
}>;

export type ConfigurationOption = Readonly<{
  configurationId: ConfigurationId;
  optionId: ProductOptionId;
}>;

export type ConfigurationDimension = Readonly<{
  configurationId: ConfigurationId;
  dimensionDefinitionId: string;
  value: string;
  unit: string;
}>;
