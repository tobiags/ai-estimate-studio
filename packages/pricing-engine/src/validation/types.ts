import type { PricingRule } from "../rule-schema.js";

export type SelectionGroup = Readonly<{
  id: string;
  revisionId: string;
  selectionMode: "SINGLE" | "MULTIPLE";
  minSelections: number;
  maxSelections: number;
  required: boolean;
  optionIds: readonly string[];
}>;

export type OptionReference = Readonly<{
  id: string;
  revisionId: string;
  groupId: string;
}>;
export type OptionDependency = Readonly<{
  sourceOptionId: string;
  targetOptionId: string;
  sourceRevisionId: string;
  targetRevisionId: string;
  kind: "REQUIRES" | "EXCLUDES";
}>;

export type DimensionDefinition = Readonly<{
  id: string;
  revisionId: string;
  min: string;
  max: string;
  step: string;
  defaultValue?: string;
}>;

export type PricingTier = Readonly<{
  id: string;
  lowerInclusive: string;
  upperExclusive: string;
  amountMinor: string;
}>;

export type PricingValidationInput = Readonly<{
  revisionId: string;
  groups: readonly SelectionGroup[];
  options: readonly OptionReference[];
  dependencies: readonly OptionDependency[];
  dimensions: readonly DimensionDefinition[];
  tiers?: readonly PricingTier[];
  rules: readonly PricingRule[];
}>;

export type ValidationIssue = Readonly<{
  code: string;
  path: string;
  message: string;
}>;

export type PricingValidationResult = Readonly<{
  valid: boolean;
  issues: readonly ValidationIssue[];
}>;

export const validationCodes = {
  duplicateId: "DUPLICATE_ID",
  groupBounds: "GROUP_BOUNDS_INVALID",
  groupMode: "GROUP_SINGLE_MAX_INVALID",
  groupRequired: "GROUP_REQUIRED_UNSELECTABLE",
  optionGroupReference: "OPTION_GROUP_REFERENCE_NOT_FOUND",
  optionCrossRevision: "OPTION_CROSS_REVISION",
  dependencyReference: "DEPENDENCY_REFERENCE_NOT_FOUND",
  dependencyCrossRevision: "DEPENDENCY_CROSS_REVISION",
  dependencySelf: "DEPENDENCY_SELF_REFERENCE",
  dependencyCycle: "DEPENDENCY_CYCLE",
  dimensionRange: "DIMENSION_RANGE_INVALID",
  dimensionStep: "DIMENSION_STEP_INVALID",
  dimensionDefault: "DIMENSION_DEFAULT_INVALID",
  tierRange: "TIER_RANGE_INVALID",
  tierOverlap: "TIER_OVERLAP",
  stackConflict: "STACK_GROUP_CONFLICT",
} as const;
