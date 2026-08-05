import type {
  EvaluationResult,
  PricingFacts,
  PricingRule,
  PricingValidationInput,
} from "@ai-estimate-studio/pricing-engine";

export type PricingRuleSetDocument = Readonly<{
  id: string;
  organizationId: string;
  productRevisionId: string;
  revision: number;
  version: number;
  state: "DRAFT" | "PUBLISHED" | "RETIRED" | "ARCHIVED";
  schemaVersion: number;
  currency: string;
  checksum: string;
  effectiveFrom?: string | null;
  effectiveUntil?: string | null;
  rules: readonly PricingRule[];
}>;

export type PricingScenario = Readonly<{
  name: string;
  facts: PricingFacts;
}>;

export type PricingSimulation = Readonly<{
  price: EvaluationResult;
  violations: readonly string[];
}>;

export interface PricingRepository {
  find(
    scope: Readonly<{ organizationId: string }>,
    id: string,
  ): Promise<PricingRuleSetDocument | null>;
  saveDraft(
    scope: Readonly<{ organizationId: string }>,
    document: PricingRuleSetDocument,
    expectedVersion: number,
  ): Promise<PricingRuleSetDocument>;
  publish(
    scope: Readonly<{ organizationId: string }>,
    id: string,
    expectedVersion: number,
    effectiveFrom: string,
    effectiveUntil: string | null,
  ): Promise<PricingRuleSetDocument>;
}

export interface PricingAuditWriter {
  append(
    event: Readonly<{
      organizationId: string;
      action: string;
      resourceId: string;
      checksum: string;
    }>,
  ): Promise<void>;
}

export type PricingDraftInput = Readonly<{
  schemaVersion: number;
  currency: string;
  rules: readonly PricingRule[];
  validation: PricingValidationInput;
}>;
