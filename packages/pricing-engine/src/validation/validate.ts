import { PricingError } from "../errors.js";
import type {
  DimensionDefinition,
  OptionDependency,
  OptionReference,
  PricingTier,
  PricingValidationInput,
  PricingValidationResult,
  SelectionGroup,
  ValidationIssue,
} from "./types.js";
import { validationCodes as code } from "./types.js";

type Decimal = Readonly<{ value: bigint; scale: number }>;

function decimal(input: string): Decimal | undefined {
  if (!/^-?\d+(?:\.\d{1,12})?$/.test(input)) return undefined;
  const negative = input.startsWith("-");
  const unsigned = negative ? input.slice(1) : input;
  const [whole, fraction = ""] = unsigned.split(".");
  return {
    value: BigInt(`${negative ? "-" : ""}${whole}${fraction}`),
    scale: fraction.length,
  };
}

function compare(left: Decimal, right: Decimal): number {
  const scale = Math.max(left.scale, right.scale);
  const leftValue = left.value * 10n ** BigInt(scale - left.scale);
  const rightValue = right.value * 10n ** BigInt(scale - right.scale);
  return leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
}

function modulo(left: Decimal, right: Decimal): bigint {
  const scale = Math.max(left.scale, right.scale);
  const leftValue = left.value * 10n ** BigInt(scale - left.scale);
  const rightValue = right.value * 10n ** BigInt(scale - right.scale);
  return leftValue % rightValue;
}

function subtract(left: Decimal, right: Decimal): Decimal {
  const scale = Math.max(left.scale, right.scale);
  return {
    value:
      left.value * 10n ** BigInt(scale - left.scale) -
      right.value * 10n ** BigInt(scale - right.scale),
    scale,
  };
}

function issue(
  issues: ValidationIssue[],
  codeValue: string,
  path: string,
  message: string,
): void {
  issues.push({ code: codeValue, path, message });
}

function uniqueIds<T extends { id: string }>(
  items: readonly T[],
  path: string,
  issues: ValidationIssue[],
): void {
  const seen = new Set<string>();
  items.forEach((item, index) => {
    if (seen.has(item.id))
      issue(
        issues,
        code.duplicateId,
        `${path}[${index}].id`,
        `Duplicate id: ${item.id}`,
      );
    seen.add(item.id);
  });
}

function validateGroups(
  groups: readonly SelectionGroup[],
  options: readonly OptionReference[],
  revisionId: string,
  issues: ValidationIssue[],
): void {
  const optionById = new Map(options.map((option) => [option.id, option]));
  uniqueIds(groups, "groups", issues);
  groups.forEach((group, index) => {
    if (
      group.minSelections < 0 ||
      group.maxSelections < group.minSelections ||
      group.maxSelections > group.optionIds.length
    ) {
      issue(
        issues,
        code.groupBounds,
        `groups[${index}]`,
        "Selection bounds must be non-negative, ordered and reachable",
      );
    }
    if (group.selectionMode === "SINGLE" && group.maxSelections > 1) {
      issue(
        issues,
        code.groupMode,
        `groups[${index}].maxSelections`,
        "SINGLE groups cannot select more than one option",
      );
    }
    if (group.required && group.minSelections < 1) {
      issue(
        issues,
        code.groupRequired,
        `groups[${index}].minSelections`,
        "Required groups must require at least one option",
      );
    }
    group.optionIds.forEach((optionId, optionIndex) => {
      const option = optionById.get(optionId);
      if (!option)
        issue(
          issues,
          code.optionGroupReference,
          `groups[${index}].optionIds[${optionIndex}]`,
          "Option does not exist",
        );
      else {
        if (option.groupId !== group.id)
          issue(
            issues,
            code.optionGroupReference,
            `groups[${index}].optionIds[${optionIndex}]`,
            "Option belongs to another group",
          );
        if (option.revisionId !== revisionId)
          issue(
            issues,
            code.optionCrossRevision,
            `options.${optionId}`,
            "Option belongs to another revision",
          );
      }
    });
  });
}

function validateDependencies(
  dependencies: readonly OptionDependency[],
  options: readonly OptionReference[],
  revisionId: string,
  issues: ValidationIssue[],
): void {
  const optionIds = new Set(options.map((option) => option.id));
  const requires = new Map<string, string[]>();
  dependencies.forEach((dependency, index) => {
    if (
      !optionIds.has(dependency.sourceOptionId) ||
      !optionIds.has(dependency.targetOptionId)
    ) {
      issue(
        issues,
        code.dependencyReference,
        `dependencies[${index}]`,
        "Dependency references an unknown option",
      );
    }
    if (
      dependency.sourceRevisionId !== revisionId ||
      dependency.targetRevisionId !== revisionId
    ) {
      issue(
        issues,
        code.dependencyCrossRevision,
        `dependencies[${index}]`,
        "Dependency must stay within one revision",
      );
    }
    if (dependency.sourceOptionId === dependency.targetOptionId) {
      issue(
        issues,
        code.dependencySelf,
        `dependencies[${index}]`,
        "An option cannot depend on itself",
      );
    }
    if (dependency.kind === "REQUIRES") {
      const targets = requires.get(dependency.sourceOptionId) ?? [];
      targets.push(dependency.targetOptionId);
      requires.set(dependency.sourceOptionId, targets);
    }
  });

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (node: string): void => {
    if (visiting.has(node)) {
      issue(
        issues,
        code.dependencyCycle,
        `dependencies.${node}`,
        "REQUIRES dependency graph contains a cycle",
      );
      return;
    }
    if (visited.has(node)) return;
    visiting.add(node);
    for (const target of requires.get(node) ?? []) visit(target);
    visiting.delete(node);
    visited.add(node);
  };
  for (const optionId of optionIds) visit(optionId);
}

function validateDimensions(
  dimensions: readonly DimensionDefinition[],
  issues: ValidationIssue[],
): void {
  uniqueIds(dimensions, "dimensions", issues);
  dimensions.forEach((dimension, index) => {
    const min = decimal(dimension.min);
    const max = decimal(dimension.max);
    const step = decimal(dimension.step);
    if (!min || !max || compare(min, max) >= 0) {
      issue(
        issues,
        code.dimensionRange,
        `dimensions[${index}]`,
        "Dimension min/max must be valid decimals with min < max",
      );
      return;
    }
    if (!step || step.value <= 0n) {
      issue(
        issues,
        code.dimensionStep,
        `dimensions[${index}].step`,
        "Dimension step must be a positive decimal",
      );
    }
    if (dimension.defaultValue !== undefined) {
      const defaultValue = decimal(dimension.defaultValue);
      if (
        !defaultValue ||
        compare(defaultValue, min) < 0 ||
        compare(defaultValue, max) > 0 ||
        (step && modulo(subtract(defaultValue, min), step) !== 0n)
      ) {
        issue(
          issues,
          code.dimensionDefault,
          `dimensions[${index}].defaultValue`,
          "Dimension default must be on range and step boundaries",
        );
      }
    }
  });
}

function validateTiers(
  tiers: readonly PricingTier[] | undefined,
  issues: ValidationIssue[],
): void {
  if (!tiers) return;
  const parsed = tiers.map((tier, index) => ({
    tier,
    index,
    lower: decimal(tier.lowerInclusive),
    upper: decimal(tier.upperExclusive),
  }));
  for (const item of parsed) {
    if (!item.lower || !item.upper || compare(item.lower, item.upper) >= 0)
      issue(
        issues,
        code.tierRange,
        `tiers[${item.index}]`,
        "Tier lower bound must be smaller than upper bound",
      );
  }
  const ordered = parsed
    .filter((item): item is typeof item & { lower: Decimal; upper: Decimal } =>
      Boolean(item.lower && item.upper),
    )
    .sort((left, right) => compare(left.lower, right.lower));
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    if (previous && current && compare(current.lower, previous.upper) < 0)
      issue(
        issues,
        code.tierOverlap,
        `tiers[${current.index}]`,
        "Pricing tiers overlap",
      );
  }
}

function validateStacks(
  rules: PricingValidationInput["rules"],
  issues: ValidationIssue[],
): void {
  const exclusive = new Map<string, number>();
  for (const rule of rules) {
    if (!rule.stackGroup || !rule.exclusiveInGroup) continue;
    const count = exclusive.get(rule.stackGroup) ?? 0;
    exclusive.set(rule.stackGroup, count + 1);
  }
  for (const [stackGroup, count] of exclusive) {
    if (count > 1)
      issue(
        issues,
        code.stackConflict,
        `rules.stackGroup.${stackGroup}`,
        "An exclusive stack group must have one publication candidate",
      );
  }
}

export function validatePricingConfiguration(
  input: PricingValidationInput,
): PricingValidationResult {
  const issues: ValidationIssue[] = [];
  validateGroups(input.groups, input.options, input.revisionId, issues);
  validateDependencies(
    input.dependencies,
    input.options,
    input.revisionId,
    issues,
  );
  validateDimensions(input.dimensions, issues);
  validateTiers(input.tiers, issues);
  validateStacks(input.rules, issues);
  return Object.freeze({
    valid: issues.length === 0,
    issues: Object.freeze(issues),
  });
}

export function assertValidPricingConfiguration(
  input: PricingValidationInput,
): void {
  const result = validatePricingConfiguration(input);
  if (!result.valid)
    throw new PricingError(
      "INVALID_RULE",
      result.issues.map((item) => `${item.code}: ${item.message}`).join("; "),
    );
}
