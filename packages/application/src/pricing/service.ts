import {
  assertValidPricingConfiguration,
  canonicalize,
  evaluateRuleSet,
  parsePricingRuleSet,
  validatePricingConfiguration,
} from "@ai-estimate-studio/pricing-engine";
import type {
  PricingAuditWriter,
  PricingDraftInput,
  PricingRepository,
  PricingRuleSetDocument,
  PricingScenario,
  PricingSimulation,
} from "./types.js";

export class PricingApplicationError extends Error {
  constructor(
    readonly code: "NOT_FOUND" | "CONFLICT" | "VALIDATION_FAILED",
    message: string,
  ) {
    super(message);
    this.name = "PricingApplicationError";
  }
}

function checksum(input: unknown): string {
  return canonicalize(input);
}

export class PricingApplicationService {
  constructor(
    private readonly repository: PricingRepository,
    private readonly audit: PricingAuditWriter,
  ) {}

  async updateDraft(
    scope: Readonly<{ organizationId: string }>,
    current: PricingRuleSetDocument,
    input: PricingDraftInput,
  ): Promise<PricingRuleSetDocument> {
    if (current.organizationId !== scope.organizationId)
      throw new PricingApplicationError(
        "CONFLICT",
        "Pricing rule set is outside the organization scope",
      );
    const parsed = parsePricingRuleSet({
      schemaVersion: input.schemaVersion,
      currency: input.currency,
      rules: input.rules,
    });
    assertValidPricingConfiguration(input.validation);
    const document: PricingRuleSetDocument = {
      ...current,
      schemaVersion: parsed.schemaVersion,
      currency: parsed.currency,
      rules: parsed.rules,
      state: "DRAFT",
      version: current.version + 1,
      checksum: checksum(parsed),
    };
    const saved = await this.repository.saveDraft(
      scope,
      document,
      current.version,
    );
    await this.audit.append({
      organizationId: scope.organizationId,
      action: "PRICING_DRAFT_UPDATED",
      resourceId: saved.id,
      checksum: saved.checksum,
    });
    return saved;
  }

  async simulate(
    document: PricingRuleSetDocument,
    scenario: PricingScenario,
  ): Promise<PricingSimulation> {
    const parsed = parsePricingRuleSet({
      schemaVersion: document.schemaVersion,
      currency: document.currency,
      rules: document.rules,
    });
    const price = evaluateRuleSet(parsed, scenario.facts);
    const violations = BigInt(price.totalMinor) < 0n ? ["NEGATIVE_TOTAL"] : [];
    return { price, violations };
  }

  async publish(
    scope: Readonly<{ organizationId: string }>,
    document: PricingRuleSetDocument,
    scenarios: readonly PricingScenario[],
    effectiveFrom: string,
    effectiveUntil: string | null,
  ): Promise<PricingRuleSetDocument> {
    const fromTime = new Date(effectiveFrom).getTime();
    const untilTime =
      effectiveUntil === null ? null : new Date(effectiveUntil).getTime();
    if (
      Number.isNaN(fromTime) ||
      (untilTime !== null && Number.isNaN(untilTime)) ||
      (untilTime !== null && fromTime >= untilTime)
    ) {
      throw new PricingApplicationError(
        "VALIDATION_FAILED",
        "Effective interval must be ordered",
      );
    }
    const validation = validatePricingConfiguration({
      revisionId: document.productRevisionId,
      groups: [],
      options: [],
      dependencies: [],
      dimensions: [],
      rules: document.rules,
    });
    if (!validation.valid)
      throw new PricingApplicationError(
        "VALIDATION_FAILED",
        validation.issues.map((item) => item.code).join(","),
      );
    for (const scenario of scenarios) {
      const simulation = await this.simulate(document, scenario);
      if (simulation.violations.length > 0)
        throw new PricingApplicationError(
          "VALIDATION_FAILED",
          simulation.violations.join(","),
        );
    }
    const published = await this.repository.publish(
      scope,
      document.id,
      document.version,
      effectiveFrom,
      effectiveUntil,
    );
    await this.audit.append({
      organizationId: scope.organizationId,
      action: "PRICING_RULE_SET_PUBLISHED",
      resourceId: published.id,
      checksum: published.checksum,
    });
    return published;
  }
}
