import { InvalidStateTransitionError } from "./shared/errors.js";

export const organizationStatuses = [
  "ACTIVE",
  "SUSPENDED",
  "ARCHIVED",
] as const;
export type OrganizationStatus = (typeof organizationStatuses)[number];
export const membershipRoles = [
  "OWNER",
  "ADMIN",
  "CATALOG_EDITOR",
  "SALES",
  "VIEWER",
] as const;
export type MembershipRole = (typeof membershipRoles)[number];
export const membershipStatuses = ["INVITED", "ACTIVE", "SUSPENDED"] as const;
export type MembershipStatus = (typeof membershipStatuses)[number];

export const catalogStates = [
  "DRAFT",
  "PUBLISHED",
  "RETIRED",
  "ARCHIVED",
] as const;
export type CatalogState = (typeof catalogStates)[number];
export const configurationStatuses = ["ACTIVE", "QUOTED", "ABANDONED"] as const;
export type ConfigurationStatus = (typeof configurationStatuses)[number];
export const quoteStatuses = [
  "DRAFT",
  "ISSUED",
  "VIEWED",
  "CONTACTED",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
  "VOID",
] as const;
export type QuoteStatus = (typeof quoteStatuses)[number];
export const assetStatuses = [
  "UPLOADING",
  "PROCESSING",
  "READY",
  "REJECTED",
  "ARCHIVED",
] as const;
export type AssetStatus = (typeof assetStatuses)[number];
export const recommendationStatuses = [
  "GENERATED",
  "VERIFIED",
  "REJECTED",
  "FAILED",
] as const;
export type RecommendationStatus = (typeof recommendationStatuses)[number];
export const jobStatuses = [
  "PENDING",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "DEAD",
] as const;
export type JobStatus = (typeof jobStatuses)[number];

type TransitionMap<S extends string> = Readonly<Record<S, readonly S[]>>;

function transition<S extends string>(
  machine: string,
  current: S,
  next: S,
  allowed: TransitionMap<S>,
): S {
  if (!allowed[current]?.includes(next))
    throw new InvalidStateTransitionError(machine, current, next);
  return next;
}

export function transitionCatalog(
  current: CatalogState,
  next: CatalogState,
): CatalogState {
  return transition("catalog", current, next, {
    DRAFT: ["PUBLISHED", "ARCHIVED"],
    PUBLISHED: ["RETIRED"],
    RETIRED: ["ARCHIVED"],
    ARCHIVED: [],
  });
}

export function transitionConfiguration(
  current: ConfigurationStatus,
  next: ConfigurationStatus,
): ConfigurationStatus {
  return transition("configuration", current, next, {
    ACTIVE: ["QUOTED", "ABANDONED"],
    QUOTED: [],
    ABANDONED: [],
  });
}

export function transitionQuote(
  current: QuoteStatus,
  next: QuoteStatus,
): QuoteStatus {
  return transition("quote", current, next, {
    DRAFT: ["ISSUED", "VOID"],
    ISSUED: ["VIEWED", "CONTACTED", "ACCEPTED", "REJECTED", "EXPIRED", "VOID"],
    VIEWED: ["CONTACTED", "ACCEPTED", "REJECTED", "EXPIRED", "VOID"],
    CONTACTED: ["ACCEPTED", "REJECTED", "EXPIRED", "VOID"],
    ACCEPTED: [],
    REJECTED: [],
    EXPIRED: [],
    VOID: [],
  });
}

export function transitionAsset(
  current: AssetStatus,
  next: AssetStatus,
): AssetStatus {
  return transition("asset", current, next, {
    UPLOADING: ["PROCESSING"],
    PROCESSING: ["READY", "REJECTED"],
    READY: ["ARCHIVED"],
    REJECTED: ["ARCHIVED"],
    ARCHIVED: [],
  });
}

export function transitionRecommendation(
  current: RecommendationStatus,
  next: RecommendationStatus,
): RecommendationStatus {
  return transition("recommendation", current, next, {
    GENERATED: ["VERIFIED", "REJECTED", "FAILED"],
    VERIFIED: [],
    REJECTED: [],
    FAILED: [],
  });
}

export function transitionJob(current: JobStatus, next: JobStatus): JobStatus {
  return transition("job", current, next, {
    PENDING: ["RUNNING", "DEAD"],
    RUNNING: ["SUCCEEDED", "FAILED"],
    SUCCEEDED: [],
    FAILED: ["PENDING", "DEAD"],
    DEAD: [],
  });
}
