import type {
  DimensionDefinition,
  Hotspot,
  OptionDependency,
  OptionGroup,
  OrganizationScope,
  ProductAsset,
  ProductOption,
  ProductRevision,
  ProductVariant,
} from "@ai-estimate-studio/domain";

export type ProductRevisionAggregate = Readonly<{
  revision: ProductRevision;
  variants: readonly ProductVariant[];
  optionGroups: readonly Readonly<{
    group: OptionGroup;
    options: readonly ProductOption[];
  }>[];
  dependencies: readonly OptionDependency[];
  dimensions: readonly DimensionDefinition[];
  assets: readonly Readonly<{
    usage: ProductAsset;
    hotspots: readonly Hotspot[];
  }>[];
}>;

export type AggregateIssue = Readonly<{
  path: string;
  code:
    | "CROSS_REVISION_REFERENCE"
    | "DUPLICATE_ID"
    | "MISSING_REFERENCE"
    | "INVALID_SELECTION_BOUNDS"
    | "INVALID_DIMENSION_BOUNDS"
    | "INVALID_DIMENSION_STEP"
    | "DUPLICATE_CODE";
  message: string;
}>;

export class ProductRevisionApplicationError extends Error {
  constructor(
    readonly code: "NOT_FOUND" | "CONFLICT" | "PUBLISHED_IMMUTABLE" | "INVALID",
    message: string,
    readonly issues: readonly AggregateIssue[] = [],
  ) {
    super(message);
    this.name = "ProductRevisionApplicationError";
  }
}

export interface ProductRevisionAggregateRepository {
  find(
    scope: OrganizationScope,
    revisionId: string,
  ): Promise<ProductRevisionAggregate | null>;
  saveDraft(
    scope: OrganizationScope,
    aggregate: ProductRevisionAggregate,
    expectedVersion: number,
  ): Promise<ProductRevisionAggregate>;
}

export function validateProductRevisionAggregate(
  aggregate: ProductRevisionAggregate,
): readonly AggregateIssue[] {
  const issues: AggregateIssue[] = [];
  const revisionId = aggregate.revision.id;
  const ids = new Map<string, string>();
  const register = (id: string, path: string) => {
    const previous = ids.get(id);
    if (previous) {
      issues.push({
        path,
        code: "DUPLICATE_ID",
        message: `ID ${id} is already used at ${previous}`,
      });
    } else {
      ids.set(id, path);
    }
  };
  const revisionRef = (value: string, path: string) => {
    if (value !== revisionId) {
      issues.push({
        path,
        code: "CROSS_REVISION_REFERENCE",
        message: `Expected product revision ${revisionId}`,
      });
    }
  };

  register(aggregate.revision.id, "revision.id");
  const variantIds = new Set<string>();
  const variantCodes = new Set<string>();
  aggregate.variants.forEach((variant, index) => {
    register(variant.id, `variants[${index}].id`);
    revisionRef(
      variant.productRevisionId,
      `variants[${index}].productRevisionId`,
    );
    if (variantCodes.has(variant.code)) {
      issues.push({
        path: `variants[${index}].code`,
        code: "DUPLICATE_CODE",
        message: `Variant code ${variant.code} must be unique`,
      });
    }
    variantCodes.add(variant.code);
    variantIds.add(variant.id);
  });
  if (
    aggregate.revision.defaultVariantId &&
    !variantIds.has(aggregate.revision.defaultVariantId)
  ) {
    issues.push({
      path: "revision.defaultVariantId",
      code: "MISSING_REFERENCE",
      message: "Default variant must belong to the revision",
    });
  }

  const optionIds = new Set<string>();
  const groupIds = new Set<string>();
  const optionCodes = new Set<string>();
  aggregate.optionGroups.forEach(({ group, options }, groupIndex) => {
    register(group.id, `optionGroups[${groupIndex}].group.id`);
    revisionRef(
      group.productRevisionId,
      `optionGroups[${groupIndex}].group.productRevisionId`,
    );
    groupIds.add(group.id);
    if (group.maxSelections < group.minSelections || group.maxSelections < 1) {
      issues.push({
        path: `optionGroups[${groupIndex}].group`,
        code: "INVALID_SELECTION_BOUNDS",
        message:
          "Option group maxSelections must be >= minSelections and at least one",
      });
    }
    options.forEach((option, optionIndex) => {
      register(
        option.id,
        `optionGroups[${groupIndex}].options[${optionIndex}].id`,
      );
      if (option.optionGroupId !== group.id) {
        issues.push({
          path: `optionGroups[${groupIndex}].options[${optionIndex}].optionGroupId`,
          code: "MISSING_REFERENCE",
          message: "Option must reference its containing group",
        });
      }
      if (optionCodes.has(`${group.id}:${option.code}`)) {
        issues.push({
          path: `optionGroups[${groupIndex}].options[${optionIndex}].code`,
          code: "DUPLICATE_CODE",
          message: `Option code ${option.code} must be unique within its group`,
        });
      }
      optionCodes.add(`${group.id}:${option.code}`);
      optionIds.add(option.id);
    });
  });

  aggregate.dependencies.forEach((dependency, index) => {
    register(dependency.id, `dependencies[${index}].id`);
    if (!optionIds.has(dependency.sourceOptionId)) {
      issues.push({
        path: `dependencies[${index}].sourceOptionId`,
        code: "MISSING_REFERENCE",
        message: "Dependency source option is not part of the revision",
      });
    }
    if (!optionIds.has(dependency.targetOptionId)) {
      issues.push({
        path: `dependencies[${index}].targetOptionId`,
        code: "MISSING_REFERENCE",
        message: "Dependency target option is not part of the revision",
      });
    }
  });

  aggregate.dimensions.forEach((dimension, index) => {
    register(dimension.id, `dimensions[${index}].id`);
    revisionRef(
      dimension.productRevisionId,
      `dimensions[${index}].productRevisionId`,
    );
    const min = Number(dimension.min);
    const max = Number(dimension.max);
    const step = Number(dimension.step);
    if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
      issues.push({
        path: `dimensions[${index}]`,
        code: "INVALID_DIMENSION_BOUNDS",
        message: "Dimension min and max must be finite and min <= max",
      });
    }
    if (!Number.isFinite(step) || step <= 0) {
      issues.push({
        path: `dimensions[${index}].step`,
        code: "INVALID_DIMENSION_STEP",
        message: "Dimension step must be a positive finite number",
      });
    }
  });

  aggregate.assets.forEach(({ usage, hotspots }, assetIndex) => {
    register(usage.id, `assets[${assetIndex}].usage.id`);
    revisionRef(
      usage.productRevisionId,
      `assets[${assetIndex}].usage.productRevisionId`,
    );
    const hotspotIds = new Set<string>();
    hotspots.forEach((hotspot, hotspotIndex) => {
      register(
        hotspot.id,
        `assets[${assetIndex}].hotspots[${hotspotIndex}].id`,
      );
      if (hotspotIds.has(hotspot.id)) {
        issues.push({
          path: `assets[${assetIndex}].hotspots[${hotspotIndex}].id`,
          code: "DUPLICATE_ID",
          message: "Hotspot IDs must be unique within an asset",
        });
      }
      hotspotIds.add(hotspot.id);
      if (hotspot.productAssetId !== usage.id) {
        issues.push({
          path: `assets[${assetIndex}].hotspots[${hotspotIndex}].productAssetId`,
          code: "MISSING_REFERENCE",
          message: "Hotspot must reference its containing asset usage",
        });
      }
    });
  });

  if (aggregate.revision.state !== "DRAFT") {
    issues.push({
      path: "revision.state",
      code: "MISSING_REFERENCE",
      message: "Only draft revisions can be edited",
    });
  }
  return issues;
}

export class ProductRevisionApplicationService {
  constructor(
    private readonly repository: ProductRevisionAggregateRepository,
  ) {}

  async get(
    scope: OrganizationScope,
    revisionId: string,
  ): Promise<ProductRevisionAggregate> {
    const aggregate = await this.repository.find(scope, revisionId);
    if (!aggregate) {
      throw new ProductRevisionApplicationError(
        "NOT_FOUND",
        "Product revision not found",
      );
    }
    return aggregate;
  }

  validate(aggregate: ProductRevisionAggregate): readonly AggregateIssue[] {
    return validateProductRevisionAggregate(aggregate);
  }

  async saveDraft(
    scope: OrganizationScope,
    aggregate: ProductRevisionAggregate,
    expectedVersion: number,
  ): Promise<ProductRevisionAggregate> {
    const issues = validateProductRevisionAggregate(aggregate);
    if (issues.length > 0) {
      const immutable = issues.some(
        (issue) =>
          issue.path === "revision.state" &&
          aggregate.revision.state !== "DRAFT",
      );
      if (immutable) {
        throw new ProductRevisionApplicationError(
          "PUBLISHED_IMMUTABLE",
          "Published product revisions are immutable",
          issues,
        );
      }
      throw new ProductRevisionApplicationError(
        "INVALID",
        "Product revision aggregate is invalid",
        issues,
      );
    }
    if (aggregate.revision.version !== expectedVersion) {
      throw new ProductRevisionApplicationError(
        "CONFLICT",
        "Product revision version does not match the expected version",
      );
    }
    return this.repository.saveDraft(scope, aggregate, expectedVersion);
  }
}
