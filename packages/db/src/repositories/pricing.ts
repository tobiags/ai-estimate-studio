import type { Prisma, PrismaClient } from "@prisma/client";
import {
  parsePricingRuleSet,
  type PricingRule,
} from "@ai-estimate-studio/pricing-engine";
import type {
  PricingRepository,
  PricingRuleSetDocument,
} from "@ai-estimate-studio/application";
import {
  NotFoundError,
  VersionConflictError,
} from "@ai-estimate-studio/domain";
import { prisma } from "../client.js";

type PricingRow = Prisma.PricingRuleSetGetPayload<{
  include: { rules: true; productRevision: { include: { product: true } } };
}>;

function jsonObject(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function labelString(value: Prisma.JsonValue, code: string): string {
  if (typeof value !== "string")
    throw new Error(`Pricing rule ${code} label must be a string`);
  return value;
}

function mapRow(row: PricingRow): PricingRuleSetDocument {
  const rules: PricingRule[] = row.rules.map((rule) => ({
    id: rule.id,
    code: rule.code,
    kind: rule.kind,
    priority: rule.priority,
    label: labelString(rule.label, rule.code),
    condition: rule.condition as PricingRule["condition"],
    action: rule.action as PricingRule["action"],
    ...(rule.stackGroup === null ? {} : { stackGroup: rule.stackGroup }),
    exclusiveInGroup: rule.exclusiveInGroup,
    ...(rule.taxClass === null ? {} : { taxClass: rule.taxClass }),
  }));
  const parsed = parsePricingRuleSet({
    schemaVersion: row.schemaVersion,
    currency: row.currency,
    rules,
  });
  return {
    id: row.id,
    organizationId: row.productRevision.product.organizationId,
    productRevisionId: row.productRevisionId,
    revision: row.revision,
    version: row.version,
    state: row.state,
    schemaVersion: parsed.schemaVersion,
    currency: parsed.currency,
    checksum: row.checksum,
    effectiveFrom: row.effectiveFrom?.toISOString() ?? null,
    effectiveUntil: row.effectiveUntil?.toISOString() ?? null,
    rules: parsed.rules,
  };
}

export class PrismaPricingRepository implements PricingRepository {
  constructor(private readonly client: PrismaClient = prisma) {}

  private include() {
    return {
      rules: true,
      productRevision: { include: { product: true } },
    } as const;
  }

  async find(
    scope: Readonly<{ organizationId: string }>,
    id: string,
  ): Promise<PricingRuleSetDocument | null> {
    const row = await this.client.pricingRuleSet.findFirst({
      where: {
        id,
        productRevision: { product: { organizationId: scope.organizationId } },
      },
      include: this.include(),
    });
    return row ? mapRow(row) : null;
  }

  async saveDraft(
    scope: Readonly<{ organizationId: string }>,
    document: PricingRuleSetDocument,
    expectedVersion: number,
  ): Promise<PricingRuleSetDocument> {
    return this.client.$transaction(async (tx) => {
      const result = await tx.pricingRuleSet.updateMany({
        where: {
          id: document.id,
          version: expectedVersion,
          productRevision: {
            product: { organizationId: scope.organizationId },
          },
        },
        data: {
          schemaVersion: document.schemaVersion,
          currency: document.currency,
          checksum: document.checksum,
          state: "DRAFT",
          version: document.version,
          effectiveFrom: null,
          effectiveUntil: null,
          publishedAt: null,
        },
      });
      if (result.count === 0)
        return this.conflictOrNotFound(tx, scope, document.id, expectedVersion);
      await tx.pricingRule.deleteMany({
        where: { pricingRuleSetId: document.id },
      });
      if (document.rules.length > 0)
        await tx.pricingRule.createMany({
          data: document.rules.map((rule) => ({
            pricingRuleSetId: document.id,
            id: rule.id,
            code: rule.code,
            kind: rule.kind,
            priority: rule.priority,
            label: jsonObject(rule.label),
            condition: jsonObject(rule.condition),
            action: jsonObject(rule.action),
            stackGroup: rule.stackGroup ?? null,
            exclusiveInGroup: rule.exclusiveInGroup,
            taxClass: rule.taxClass ?? null,
          })),
        });
      const saved = await tx.pricingRuleSet.findFirst({
        where: { id: document.id },
        include: this.include(),
      });
      if (!saved) throw new NotFoundError("Pricing rule set", document.id);
      return mapRow(saved);
    });
  }

  private async conflictOrNotFound(
    tx: Prisma.TransactionClient,
    scope: Readonly<{ organizationId: string }>,
    id: string,
    expectedVersion: number,
  ): Promise<never> {
    const current = await tx.pricingRuleSet.findFirst({
      where: {
        id,
        productRevision: { product: { organizationId: scope.organizationId } },
      },
      select: { version: true },
    });
    if (!current) throw new NotFoundError("Pricing rule set", id);
    throw new VersionConflictError(
      "Pricing rule set",
      expectedVersion,
      current.version,
    );
  }

  async publish(
    scope: Readonly<{ organizationId: string }>,
    id: string,
    expectedVersion: number,
    effectiveFrom: string,
    effectiveUntil: string | null,
  ): Promise<PricingRuleSetDocument> {
    return this.client.$transaction(async (tx) => {
      const current = await tx.pricingRuleSet.findFirst({
        where: {
          id,
          version: expectedVersion,
          productRevision: {
            product: { organizationId: scope.organizationId },
          },
        },
        select: { productRevisionId: true },
      });
      if (!current)
        return this.conflictOrNotFound(tx, scope, id, expectedVersion);
      await tx.pricingRuleSet.updateMany({
        where: {
          productRevisionId: current.productRevisionId,
          state: "PUBLISHED",
          id: { not: id },
        },
        data: { state: "RETIRED" },
      });
      const updated = await tx.pricingRuleSet.updateMany({
        where: {
          id,
          version: expectedVersion,
          productRevision: {
            product: { organizationId: scope.organizationId },
          },
        },
        data: {
          state: "PUBLISHED",
          version: expectedVersion + 1,
          effectiveFrom: new Date(effectiveFrom),
          effectiveUntil: effectiveUntil ? new Date(effectiveUntil) : null,
          publishedAt: new Date(),
        },
      });
      if (updated.count === 0)
        return this.conflictOrNotFound(tx, scope, id, expectedVersion);
      const row = await tx.pricingRuleSet.findFirst({
        where: { id },
        include: this.include(),
      });
      if (!row) throw new NotFoundError("Pricing rule set", id);
      return mapRow(row);
    });
  }
}
