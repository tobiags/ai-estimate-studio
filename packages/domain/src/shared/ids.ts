import { DomainValidationError } from "./errors.js";

export type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type OrganizationId = Brand<string, "OrganizationId">;
export type UserId = Brand<string, "UserId">;
export type MembershipId = Brand<string, "MembershipId">;
export type CategoryId = Brand<string, "CategoryId">;
export type ProductId = Brand<string, "ProductId">;
export type ProductRevisionId = Brand<string, "ProductRevisionId">;
export type ProductVariantId = Brand<string, "ProductVariantId">;
export type OptionGroupId = Brand<string, "OptionGroupId">;
export type ProductOptionId = Brand<string, "ProductOptionId">;
export type OptionDependencyId = Brand<string, "OptionDependencyId">;
export type DimensionDefinitionId = Brand<string, "DimensionDefinitionId">;
export type AssetId = Brand<string, "AssetId">;
export type ProductAssetId = Brand<string, "ProductAssetId">;
export type HotspotId = Brand<string, "HotspotId">;
export type PricingRuleSetId = Brand<string, "PricingRuleSetId">;
export type PricingRuleId = Brand<string, "PricingRuleId">;
export type ConfigurationId = Brand<string, "ConfigurationId">;
export type ConfigurationOptionId = Brand<string, "ConfigurationOptionId">;
export type CustomerId = Brand<string, "CustomerId">;
export type QuoteId = Brand<string, "QuoteId">;
export type QuoteLineId = Brand<string, "QuoteLineId">;
export type ConsentRecordId = Brand<string, "ConsentRecordId">;
export type AIRecommendationId = Brand<string, "AIRecommendationId">;
export type AuditEventId = Brand<string, "AuditEventId">;
export type AsyncJobId = Brand<string, "AsyncJobId">;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function createId<T extends string>(value: unknown, label: string): T {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new DomainValidationError(`${label} id is required`, { label });
  }
  if (!isUuid(value)) {
    throw new DomainValidationError(`${label} id is invalid`, { label });
  }
  return value as T;
}
