import type { Prisma, PrismaClient } from "@prisma/client";
import {
  createCurrencyCode,
  createId,
  createLocalizedText,
  createMoney,
  createRevision,
  createVersion,
  DomainInvariantError,
  NotFoundError,
  VersionConflictError,
  type AssetRole,
  type DimensionDefinition,
  type Hotspot,
  type LocalizedText,
  type OptionDependency,
  type OptionGroup,
  type OrganizationScope,
  type ProductAsset,
  type ProductOption,
  type ProductRevision,
  type ProductVariant,
} from "@ai-estimate-studio/domain";
import type {
  ProductRevisionAggregate,
  ProductRevisionAggregateRepository,
} from "@ai-estimate-studio/application";
import { prisma } from "../client.js";

const revisionInclude = {
  variants: true,
  optionGroups: { include: { options: true } },
  dimensions: true,
  assets: { include: { hotspots: true } },
} as const;

type RevisionRow = Prisma.ProductRevisionGetPayload<{
  include: typeof revisionInclude;
}>;

function localized(value: Prisma.JsonValue, field: string): LocalizedText {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new DomainInvariantError(`${field} must be a localized object`);
  }
  const entries = Object.entries(value);
  if (entries.some(([, item]) => typeof item !== "string")) {
    throw new DomainInvariantError(`${field} localized values must be strings`);
  }
  return createLocalizedText(
    Object.fromEntries(entries) as Record<string, string>,
  );
}

function vector(
  value: Prisma.JsonValue,
  field: string,
): readonly [number, number, number] {
  if (
    !Array.isArray(value) ||
    value.length !== 3 ||
    value.some((item) => typeof item !== "number" || !Number.isFinite(item))
  ) {
    throw new DomainInvariantError(
      `${field} must be a finite vector of length three`,
    );
  }
  return [value[0] as number, value[1] as number, value[2] as number];
}

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function mapRevision(row: RevisionRow): ProductRevision {
  return {
    id: createId(row.id, "Product revision"),
    productId: createId(row.productId, "Product"),
    revision: createRevision(row.revision),
    state: row.state,
    name: localized(row.name, "ProductRevision.name"),
    shortDescription: localized(
      row.shortDescription,
      "ProductRevision.shortDescription",
    ),
    description: localized(row.description, "ProductRevision.description"),
    ...(row.defaultVariantId
      ? { defaultVariantId: createId(row.defaultVariantId, "Product variant") }
      : {}),
    viewerSchemaVersion: row.viewerSchemaVersion,
    version: createVersion(row.version),
  };
}

function mapVariant(row: RevisionRow["variants"][number]): ProductVariant {
  return {
    id: createId(row.id, "Product variant"),
    productRevisionId: createId(row.productRevisionId, "Product revision"),
    code: row.code,
    name: localized(row.name, "ProductVariant.name"),
    description: localized(row.description, "ProductVariant.description"),
    basePrice: createMoney(
      BigInt(row.baseAmountMinor),
      createCurrencyCode(row.currency),
    ),
    isDefault: false,
    sortOrder: row.sortOrder,
  };
}

function mapAggregate(
  row: RevisionRow,
  dependencyRows: readonly Prisma.OptionDependencyGetPayload<Prisma.OptionDependencyDefaultArgs>[] = [],
): ProductRevisionAggregate {
  const revision = mapRevision(row);
  const variants = row.variants.map((variant) => ({
    ...mapVariant(variant),
    isDefault: variant.id === row.defaultVariantId,
  }));
  const optionGroups = row.optionGroups.map((group) => {
    const options = group.options.map((option): ProductOption => ({
      id: createId(option.id, "Product option"),
      optionGroupId: createId(option.optionGroupId, "Option group"),
      code: option.code,
      name: localized(option.name, "ProductOption.name"),
      description: localized(option.description, "ProductOption.description"),
      state: option.state,
      ...(option.viewerMappingKey
        ? { viewerMappingKey: option.viewerMappingKey }
        : {}),
      sortOrder: option.sortOrder,
    }));
    const maxSelections = Math.max(
      group.maxSelections ?? 0,
      group.minSelections,
      1,
      options.length,
    );
    const mapped: OptionGroup = {
      id: createId(group.id, "Option group"),
      productRevisionId: createId(row.id, "Product revision"),
      code: group.code,
      name: localized(group.name, "OptionGroup.name"),
      description: localized(group.description, "OptionGroup.description"),
      selectionMode: group.mode,
      minSelections: group.minSelections,
      maxSelections,
      required: group.minSelections > 0,
      sortOrder: group.sortOrder,
    };
    return { group: mapped, options };
  });
  const dimensions = row.dimensions.map((dimension): DimensionDefinition => ({
    id: createId(dimension.id, "Dimension definition"),
    productRevisionId: createId(row.id, "Product revision"),
    code: dimension.code,
    label: localized(dimension.label, "DimensionDefinition.label"),
    unit: dimension.unit,
    min: dimension.minValue.toString(),
    max: dimension.maxValue.toString(),
    step: dimension.stepValue.toString(),
    ...(dimension.defaultValue === null
      ? {}
      : { defaultValue: dimension.defaultValue.toString() }),
    required: dimension.required,
  }));
  const assets = row.assets.map(
    ({
      hotspots,
      ...usage
    }): {
      usage: ProductAsset;
      hotspots: readonly Hotspot[];
    } => ({
      usage: {
        id: createId(usage.id, "Product asset"),
        productRevisionId: createId(row.id, "Product revision"),
        assetId: createId(usage.assetId, "Asset"),
        role: usage.role as AssetRole,
        sortOrder: usage.sortOrder,
      },
      hotspots: hotspots.map((hotspot): Hotspot => ({
        id: createId(hotspot.id, "Hotspot"),
        productAssetId: createId(usage.id, "Product asset"),
        code: hotspot.code,
        label: localized(hotspot.label, "Hotspot.label"),
        detail: localized(hotspot.detail, "Hotspot.detail"),
        nodeMappingKey: hotspot.nodeKey ?? hotspot.code,
        position: vector(hotspot.position, "Hotspot.position"),
        normal: hotspot.normal
          ? vector(hotspot.normal, "Hotspot.normal")
          : [0, 0, 1],
        sortOrder: hotspot.sortOrder,
      })),
    }),
  );
  return {
    revision,
    variants,
    optionGroups,
    dependencies: dependencyRows.map((dependency): OptionDependency => ({
      id: createId(dependency.id, "Option dependency"),
      sourceOptionId: createId(dependency.sourceOptionId, "Product option"),
      targetOptionId: createId(dependency.targetOptionId, "Product option"),
      kind: dependency.kind,
    })),
    dimensions,
    assets,
  };
}

export class PrismaProductRevisionAggregateRepository implements ProductRevisionAggregateRepository {
  constructor(private readonly client: PrismaClient = prisma) {}

  async find(
    scope: OrganizationScope,
    revisionId: string,
  ): Promise<ProductRevisionAggregate | null> {
    const row = await this.client.productRevision.findFirst({
      where: {
        id: revisionId,
        product: { organizationId: scope.organizationId },
      },
      include: revisionInclude,
    });
    if (!row) return null;
    const dependencies = await this.client.optionDependency.findMany({
      where: {
        sourceOption: { optionGroup: { productRevisionId: revisionId } },
      },
    });
    return mapAggregate(row, dependencies);
  }

  async saveDraft(
    scope: OrganizationScope,
    aggregate: ProductRevisionAggregate,
    expectedVersion: number,
  ): Promise<ProductRevisionAggregate> {
    const revisionId = aggregate.revision.id as string;
    const assetIds = aggregate.assets.map(
      ({ usage }) => usage.assetId as string,
    );
    const result = await this.client.$transaction(async (tx) => {
      const current = await tx.productRevision.findFirst({
        where: {
          id: revisionId,
          product: { organizationId: scope.organizationId },
        },
        select: { version: true, state: true },
      });
      if (!current) throw new NotFoundError("Product revision", revisionId);
      if (current.state !== "DRAFT") {
        throw new VersionConflictError(
          "Product revision",
          expectedVersion,
          current.version,
        );
      }
      if (current.version !== expectedVersion) {
        throw new VersionConflictError(
          "Product revision",
          expectedVersion,
          current.version,
        );
      }
      if (assetIds.length > 0) {
        const assets = await tx.asset.findMany({
          where: { id: { in: assetIds }, organizationId: scope.organizationId },
          select: { id: true },
        });
        if (assets.length !== new Set(assetIds).size) {
          throw new NotFoundError("Asset", "one or more referenced assets");
        }
      }
      await tx.productRevision.update({
        where: { id: revisionId },
        data: {
          defaultVariantId: null,
          name: json(aggregate.revision.name),
          shortDescription: json(aggregate.revision.shortDescription),
          description: json(aggregate.revision.description),
          viewerSchemaVersion: aggregate.revision.viewerSchemaVersion,
          version: expectedVersion + 1,
        },
      });
      await tx.productAsset.deleteMany({
        where: { productRevisionId: revisionId },
      });
      await tx.dimensionDefinition.deleteMany({
        where: { productRevisionId: revisionId },
      });
      await tx.optionGroup.deleteMany({
        where: { productRevisionId: revisionId },
      });
      await tx.productVariant.deleteMany({
        where: { productRevisionId: revisionId },
      });
      for (const variant of aggregate.variants) {
        await tx.productVariant.create({
          data: {
            id: variant.id as string,
            productRevisionId: revisionId,
            code: variant.code,
            name: json(variant.name),
            description: json(variant.description),
            baseAmountMinor: variant.basePrice.amountMinor,
            currency: variant.basePrice.currency,
            sortOrder: variant.sortOrder,
          },
        });
      }
      for (const { group, options } of aggregate.optionGroups) {
        await tx.optionGroup.create({
          data: {
            id: group.id as string,
            productRevisionId: revisionId,
            code: group.code,
            name: json(group.name),
            description: json(group.description),
            mode: group.selectionMode,
            minSelections: group.minSelections,
            maxSelections: group.maxSelections,
            sortOrder: group.sortOrder,
            options: {
              create: options.map((option) => ({
                id: option.id as string,
                code: option.code,
                name: json(option.name),
                description: json(option.description),
                state: option.state,
                viewerMappingKey: option.viewerMappingKey,
                sortOrder: option.sortOrder,
              })),
            },
          },
        });
      }
      if (aggregate.dependencies.length > 0) {
        await tx.optionDependency.createMany({
          data: aggregate.dependencies.map((dependency) => ({
            id: dependency.id as string,
            sourceOptionId: dependency.sourceOptionId as string,
            targetOptionId: dependency.targetOptionId as string,
            kind: dependency.kind,
          })),
        });
      }
      for (const dimension of aggregate.dimensions) {
        await tx.dimensionDefinition.create({
          data: {
            id: dimension.id as string,
            productRevisionId: revisionId,
            code: dimension.code,
            label: json(dimension.label),
            unit: dimension.unit,
            minValue: new Prisma.Decimal(dimension.min),
            maxValue: new Prisma.Decimal(dimension.max),
            stepValue: new Prisma.Decimal(dimension.step),
            ...(dimension.defaultValue === undefined
              ? {}
              : { defaultValue: new Prisma.Decimal(dimension.defaultValue) }),
            required: dimension.required,
            sortOrder: 0,
          },
        });
      }
      for (const { usage, hotspots } of aggregate.assets) {
        await tx.productAsset.create({
          data: {
            id: usage.id as string,
            productRevisionId: revisionId,
            assetId: usage.assetId as string,
            role: usage.role,
            sortOrder: usage.sortOrder,
            hotspots: {
              create: hotspots.map((hotspot) => ({
                id: hotspot.id as string,
                code: hotspot.code,
                label: json(hotspot.label),
                detail: json(hotspot.detail),
                nodeKey: hotspot.nodeMappingKey,
                position: json(hotspot.position),
                normal: json(hotspot.normal),
                sortOrder: hotspot.sortOrder,
              })),
            },
          },
        });
      }
      const defaultVariantId = aggregate.revision.defaultVariantId as
        string | undefined;
      const updated = await tx.productRevision.update({
        where: { id: revisionId },
        data: {
          ...(defaultVariantId === undefined ? {} : { defaultVariantId }),
        },
        include: revisionInclude,
      });
      const dependencies = await tx.optionDependency.findMany({
        where: {
          sourceOption: { optionGroup: { productRevisionId: revisionId } },
        },
      });
      return { updated, dependencies };
    });
    return mapAggregate(result.updated, result.dependencies);
  }
}
