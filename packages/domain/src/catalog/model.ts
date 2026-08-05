import type { Brand } from "../shared/ids.js";
import type {
  AssetId,
  CategoryId,
  DimensionDefinitionId,
  HotspotId,
  OptionDependencyId,
  OptionGroupId,
  ProductAssetId,
  ProductId,
  ProductOptionId,
  ProductRevisionId,
  ProductVariantId,
} from "../shared/ids.js";
import type { LocalizedText } from "../shared/locale.js";
import type { Money } from "../shared/money.js";
import type { Revision, Version } from "../shared/revision.js";
import type { CatalogState } from "../state-machines.js";
import type { OrganizationId } from "../shared/ids.js";

export const selectionModes = ["SINGLE", "MULTIPLE"] as const;
export type SelectionMode = (typeof selectionModes)[number];
export const dependencyKinds = ["REQUIRES", "EXCLUDES"] as const;
export type DependencyKind = (typeof dependencyKinds)[number];
export const assetKinds = ["MODEL_3D", "IMAGE", "PDF", "OTHER"] as const;
export type AssetKind = (typeof assetKinds)[number];
export const assetRoles = [
  "MODEL",
  "POSTER",
  "GALLERY",
  "DOCUMENT",
  "PDF_QUOTE",
] as const;
export type AssetRole = (typeof assetRoles)[number];

export type Category = Readonly<{
  id: CategoryId;
  organizationId: OrganizationId;
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  sortOrder: number;
  state: CatalogState;
  version: Version;
}>;

export type Product = Readonly<{
  id: ProductId;
  organizationId: OrganizationId;
  categoryId: CategoryId;
  slug: string;
  state: CatalogState;
  version: Version;
}>;

export type ProductRevision = Readonly<{
  id: ProductRevisionId;
  productId: ProductId;
  revision: Revision;
  state: CatalogState;
  name: LocalizedText;
  shortDescription: LocalizedText;
  description: LocalizedText;
  defaultVariantId?: ProductVariantId;
  viewerSchemaVersion: number;
  version: Version;
}>;

export type ProductVariant = Readonly<{
  id: ProductVariantId;
  productRevisionId: ProductRevisionId;
  code: string;
  name: LocalizedText;
  description: LocalizedText;
  basePrice: Money;
  isDefault: boolean;
  sortOrder: number;
}>;

export type OptionGroup = Readonly<{
  id: OptionGroupId;
  productRevisionId: ProductRevisionId;
  code: string;
  name: LocalizedText;
  description: LocalizedText;
  selectionMode: SelectionMode;
  minSelections: number;
  maxSelections: number;
  required: boolean;
  sortOrder: number;
}>;

export type ProductOption = Readonly<{
  id: ProductOptionId;
  optionGroupId: OptionGroupId;
  code: string;
  name: LocalizedText;
  description: LocalizedText;
  state: CatalogState;
  viewerMappingKey?: string;
  sortOrder: number;
}>;

export type OptionDependency = Readonly<{
  id: OptionDependencyId;
  sourceOptionId: ProductOptionId;
  targetOptionId: ProductOptionId;
  kind: DependencyKind;
}>;

export type DimensionDefinition = Readonly<{
  id: DimensionDefinitionId;
  productRevisionId: ProductRevisionId;
  code: string;
  label: LocalizedText;
  unit: string;
  min: string;
  max: string;
  step: string;
  defaultValue?: string;
  required: boolean;
}>;

export type Asset = Readonly<{
  id: AssetId;
  organizationId: OrganizationId;
  kind: AssetKind;
  storageKey: string;
  mimeType: string;
  sizeBytes: bigint;
  sha256: string;
}>;

export type ProductAsset = Readonly<{
  id: ProductAssetId;
  productRevisionId: ProductRevisionId;
  assetId: AssetId;
  role: AssetRole;
  sortOrder: number;
}>;

export type Hotspot = Readonly<{
  id: HotspotId;
  productAssetId: ProductAssetId;
  code: string;
  label: LocalizedText;
  detail: LocalizedText;
  nodeMappingKey: string;
  position: readonly [number, number, number];
  normal: readonly [number, number, number];
  sortOrder: number;
}>;

export type CatalogCode = Brand<string, "CatalogCode">;
