-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'ADMIN', 'CATALOG_EDITOR', 'SALES', 'VIEWER');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CatalogState" AS ENUM ('DRAFT', 'PUBLISHED', 'RETIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SelectionMode" AS ENUM ('SINGLE', 'MULTIPLE');

-- CreateEnum
CREATE TYPE "DependencyKind" AS ENUM ('REQUIRES', 'EXCLUDES');

-- CreateEnum
CREATE TYPE "AssetKind" AS ENUM ('MODEL_3D', 'IMAGE', 'PDF', 'OTHER');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('UPLOADING', 'PROCESSING', 'READY', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AssetRole" AS ENUM ('MODEL', 'POSTER', 'GALLERY', 'DOCUMENT', 'PDF_QUOTE');

-- CreateEnum
CREATE TYPE "RuleKind" AS ENUM ('BASE', 'OPTION', 'DIMENSION', 'LABOUR', 'DELIVERY', 'DISCOUNT', 'TAX', 'FEE');

-- CreateEnum
CREATE TYPE "ConfigurationStatus" AS ENUM ('ACTIVE', 'QUOTED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'ISSUED', 'VIEWED', 'CONTACTED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'VOID');

-- CreateEnum
CREATE TYPE "ConsentPurpose" AS ENUM ('QUOTE_FOLLOW_UP', 'MARKETING', 'PRIVACY_POLICY');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('GRANTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('GENERATED', 'VERIFIED', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'DEAD');

-- CreateTable
CREATE TABLE "Organization" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "canonicalHost" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "defaultLocale" TEXT NOT NULL,
    "supportedLocales" TEXT[],
    "timezone" TEXT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "quoteValidityDays" INTEGER NOT NULL DEFAULT 30,
    "taxInclusive" BOOLEAN NOT NULL DEFAULT false,
    "brandConfig" JSONB NOT NULL,
    "legalConfig" JSONB NOT NULL,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "emailVerified" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'INVITED',
    "version" INTEGER NOT NULL DEFAULT 1,
    "invitedAt" TIMESTAMPTZ(3),
    "acceptedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "description" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "state" "CatalogState" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "state" "CatalogState" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductRevision" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "revision" INTEGER NOT NULL,
    "state" "CatalogState" NOT NULL DEFAULT 'DRAFT',
    "name" JSONB NOT NULL,
    "shortDescription" JSONB NOT NULL,
    "description" JSONB NOT NULL,
    "assumptions" JSONB NOT NULL,
    "exclusions" JSONB NOT NULL,
    "defaultVariantId" UUID,
    "viewerSchemaVersion" INTEGER NOT NULL DEFAULT 1,
    "publishedAt" TIMESTAMPTZ(3),
    "publishFrom" TIMESTAMPTZ(3),
    "publishUntil" TIMESTAMPTZ(3),
    "contentChecksum" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" UUID NOT NULL,
    "productRevisionId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "description" JSONB NOT NULL,
    "baseAmountMinor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptionGroup" (
    "id" UUID NOT NULL,
    "productRevisionId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "description" JSONB NOT NULL,
    "mode" "SelectionMode" NOT NULL,
    "minSelections" INTEGER NOT NULL DEFAULT 0,
    "maxSelections" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OptionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductOption" (
    "id" UUID NOT NULL,
    "optionGroupId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "description" JSONB NOT NULL,
    "state" "CatalogState" NOT NULL DEFAULT 'DRAFT',
    "viewerMappingKey" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptionDependency" (
    "id" UUID NOT NULL,
    "sourceOptionId" UUID NOT NULL,
    "targetOptionId" UUID NOT NULL,
    "kind" "DependencyKind" NOT NULL,

    CONSTRAINT "OptionDependency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DimensionDefinition" (
    "id" UUID NOT NULL,
    "productRevisionId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "label" JSONB NOT NULL,
    "unit" TEXT NOT NULL,
    "minValue" DECIMAL(18,6) NOT NULL,
    "maxValue" DECIMAL(18,6) NOT NULL,
    "stepValue" DECIMAL(18,6) NOT NULL,
    "defaultValue" DECIMAL(18,6),
    "required" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DimensionDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "kind" "AssetKind" NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'UPLOADING',
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "bytes" BIGINT NOT NULL,
    "sha256" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "errorCode" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readyAt" TIMESTAMPTZ(3),

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAsset" (
    "id" UUID NOT NULL,
    "productRevisionId" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "role" "AssetRole" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "viewerManifest" JSONB,

    CONSTRAINT "ProductAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hotspot" (
    "id" UUID NOT NULL,
    "productAssetId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "label" JSONB NOT NULL,
    "detail" JSONB NOT NULL,
    "nodeKey" TEXT,
    "position" JSONB NOT NULL,
    "normal" JSONB,
    "visibility" JSONB,
    "focusCamera" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Hotspot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingRuleSet" (
    "id" UUID NOT NULL,
    "productRevisionId" UUID NOT NULL,
    "revision" INTEGER NOT NULL,
    "state" "CatalogState" NOT NULL DEFAULT 'DRAFT',
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "currency" CHAR(3) NOT NULL,
    "effectiveFrom" TIMESTAMPTZ(3),
    "effectiveUntil" TIMESTAMPTZ(3),
    "checksum" TEXT NOT NULL,
    "publishedAt" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PricingRuleSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingRule" (
    "id" UUID NOT NULL,
    "pricingRuleSetId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "RuleKind" NOT NULL,
    "priority" INTEGER NOT NULL,
    "label" JSONB NOT NULL,
    "condition" JSONB NOT NULL,
    "action" JSONB NOT NULL,
    "stackGroup" TEXT,
    "exclusiveInGroup" BOOLEAN NOT NULL DEFAULT false,
    "taxClass" TEXT,

    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configuration" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "productRevisionId" UUID NOT NULL,
    "pricingRuleSetId" UUID NOT NULL,
    "variantId" UUID NOT NULL,
    "locale" TEXT NOT NULL,
    "status" "ConfigurationStatus" NOT NULL DEFAULT 'ACTIVE',
    "budgetMinor" BIGINT,
    "sessionTokenHash" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Configuration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigurationOption" (
    "configurationId" UUID NOT NULL,
    "optionId" UUID NOT NULL,

    CONSTRAINT "ConfigurationOption_pkey" PRIMARY KEY ("configurationId","optionId")
);

-- CreateTable
CREATE TABLE "ConfigurationDimension" (
    "configurationId" UUID NOT NULL,
    "definitionId" UUID NOT NULL,
    "value" DECIMAL(18,6) NOT NULL,
    "unit" TEXT NOT NULL,

    CONSTRAINT "ConfigurationDimension_pkey" PRIMARY KEY ("configurationId","definitionId")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "locale" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "anonymizedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "configurationId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'ISSUED',
    "currency" CHAR(3) NOT NULL,
    "subtotalMinor" BIGINT NOT NULL,
    "discountMinor" BIGINT NOT NULL,
    "taxMinor" BIGINT NOT NULL,
    "totalMinor" BIGINT NOT NULL,
    "configurationSnapshot" JSONB NOT NULL,
    "catalogSnapshot" JSONB NOT NULL,
    "pricingSnapshot" JSONB NOT NULL,
    "traceChecksum" TEXT NOT NULL,
    "publicTokenHash" TEXT,
    "publicTokenExpiresAt" TIMESTAMPTZ(3),
    "publicTokenRevokedAt" TIMESTAMPTZ(3),
    "pdfAssetId" UUID,
    "idempotencyKeyHash" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "issuedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteLine" (
    "id" UUID NOT NULL,
    "quoteId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "RuleKind" NOT NULL,
    "label" TEXT NOT NULL,
    "quantity" DECIMAL(18,6) NOT NULL,
    "unit" TEXT,
    "unitAmountMinor" BIGINT NOT NULL,
    "netAmountMinor" BIGINT NOT NULL,
    "taxAmountMinor" BIGINT NOT NULL,
    "totalAmountMinor" BIGINT NOT NULL,
    "taxClass" TEXT,
    "source" JSONB NOT NULL,

    CONSTRAINT "QuoteLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "quoteId" UUID,
    "purpose" "ConsentPurpose" NOT NULL,
    "status" "ConsentStatus" NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "recordedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIRecommendation" (
    "id" UUID NOT NULL,
    "configurationId" UUID NOT NULL,
    "quoteId" UUID,
    "status" "RecommendationStatus" NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "contextChecksum" TEXT NOT NULL,
    "output" JSONB,
    "citedEntityIds" TEXT[],
    "verification" JSONB NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "costMicros" BIGINT,
    "latencyMs" INTEGER,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "actorUserId" UUID,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "changeSummary" JSONB NOT NULL,
    "context" JSONB NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsyncJob" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "deduplicationKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "availableAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMPTZ(3),
    "lockedBy" TEXT,
    "errorCode" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AsyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_canonicalHost_key" ON "Organization"("canonicalHost");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Membership_userId_status_idx" ON "Membership"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_organizationId_userId_key" ON "Membership"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "Category_organizationId_state_sortOrder_idx" ON "Category"("organizationId", "state", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Category_organizationId_slug_key" ON "Category"("organizationId", "slug");

-- CreateIndex
CREATE INDEX "Product_organizationId_categoryId_state_idx" ON "Product"("organizationId", "categoryId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "Product_organizationId_slug_key" ON "Product"("organizationId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "ProductRevision_defaultVariantId_key" ON "ProductRevision"("defaultVariantId");

-- CreateIndex
CREATE INDEX "ProductRevision_productId_state_publishedAt_idx" ON "ProductRevision"("productId", "state", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductRevision_productId_revision_key" ON "ProductRevision"("productId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_productRevisionId_code_key" ON "ProductVariant"("productRevisionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "OptionGroup_productRevisionId_code_key" ON "OptionGroup"("productRevisionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ProductOption_optionGroupId_code_key" ON "ProductOption"("optionGroupId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "OptionDependency_sourceOptionId_targetOptionId_kind_key" ON "OptionDependency"("sourceOptionId", "targetOptionId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "DimensionDefinition_productRevisionId_code_key" ON "DimensionDefinition"("productRevisionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_storageKey_key" ON "Asset"("storageKey");

-- CreateIndex
CREATE INDEX "Asset_organizationId_status_kind_idx" ON "Asset"("organizationId", "status", "kind");

-- CreateIndex
CREATE INDEX "Asset_organizationId_sha256_idx" ON "Asset"("organizationId", "sha256");

-- CreateIndex
CREATE INDEX "ProductAsset_productRevisionId_role_sortOrder_idx" ON "ProductAsset"("productRevisionId", "role", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAsset_productRevisionId_assetId_role_key" ON "ProductAsset"("productRevisionId", "assetId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Hotspot_productAssetId_code_key" ON "Hotspot"("productAssetId", "code");

-- CreateIndex
CREATE INDEX "PricingRuleSet_productRevisionId_state_effectiveFrom_idx" ON "PricingRuleSet"("productRevisionId", "state", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "PricingRuleSet_productRevisionId_revision_key" ON "PricingRuleSet"("productRevisionId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "PricingRule_pricingRuleSetId_code_key" ON "PricingRule"("pricingRuleSetId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "PricingRule_pricingRuleSetId_priority_code_key" ON "PricingRule"("pricingRuleSetId", "priority", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Configuration_sessionTokenHash_key" ON "Configuration"("sessionTokenHash");

-- CreateIndex
CREATE INDEX "Configuration_organizationId_status_expiresAt_idx" ON "Configuration"("organizationId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "Customer_organizationId_email_idx" ON "Customer"("organizationId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_configurationId_key" ON "Quote"("configurationId");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_publicTokenHash_key" ON "Quote"("publicTokenHash");

-- CreateIndex
CREATE INDEX "Quote_organizationId_issuedAt_idx" ON "Quote"("organizationId", "issuedAt" DESC);

-- CreateIndex
CREATE INDEX "Quote_organizationId_status_idx" ON "Quote"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_organizationId_quoteNumber_key" ON "Quote"("organizationId", "quoteNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_organizationId_idempotencyKeyHash_key" ON "Quote"("organizationId", "idempotencyKeyHash");

-- CreateIndex
CREATE INDEX "QuoteLine_quoteId_kind_idx" ON "QuoteLine"("quoteId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteLine_quoteId_sortOrder_key" ON "QuoteLine"("quoteId", "sortOrder");

-- CreateIndex
CREATE INDEX "ConsentRecord_customerId_purpose_recordedAt_idx" ON "ConsentRecord"("customerId", "purpose", "recordedAt");

-- CreateIndex
CREATE INDEX "AIRecommendation_configurationId_createdAt_idx" ON "AIRecommendation"("configurationId", "createdAt");

-- CreateIndex
CREATE INDEX "AIRecommendation_inputHash_promptVersion_model_idx" ON "AIRecommendation"("inputHash", "promptVersion", "model");

-- CreateIndex
CREATE INDEX "AuditEvent_organizationId_occurredAt_idx" ON "AuditEvent"("organizationId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "AuditEvent_organizationId_resourceType_resourceId_idx" ON "AuditEvent"("organizationId", "resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "AsyncJob_status_availableAt_idx" ON "AsyncJob"("status", "availableAt");

-- CreateIndex
CREATE UNIQUE INDEX "AsyncJob_organizationId_type_deduplicationKey_key" ON "AsyncJob"("organizationId", "type", "deduplicationKey");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductRevision" ADD CONSTRAINT "ProductRevision_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductRevision" ADD CONSTRAINT "ProductRevision_defaultVariantId_fkey" FOREIGN KEY ("defaultVariantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productRevisionId_fkey" FOREIGN KEY ("productRevisionId") REFERENCES "ProductRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptionGroup" ADD CONSTRAINT "OptionGroup_productRevisionId_fkey" FOREIGN KEY ("productRevisionId") REFERENCES "ProductRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOption" ADD CONSTRAINT "ProductOption_optionGroupId_fkey" FOREIGN KEY ("optionGroupId") REFERENCES "OptionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptionDependency" ADD CONSTRAINT "OptionDependency_sourceOptionId_fkey" FOREIGN KEY ("sourceOptionId") REFERENCES "ProductOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptionDependency" ADD CONSTRAINT "OptionDependency_targetOptionId_fkey" FOREIGN KEY ("targetOptionId") REFERENCES "ProductOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DimensionDefinition" ADD CONSTRAINT "DimensionDefinition_productRevisionId_fkey" FOREIGN KEY ("productRevisionId") REFERENCES "ProductRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAsset" ADD CONSTRAINT "ProductAsset_productRevisionId_fkey" FOREIGN KEY ("productRevisionId") REFERENCES "ProductRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAsset" ADD CONSTRAINT "ProductAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hotspot" ADD CONSTRAINT "Hotspot_productAssetId_fkey" FOREIGN KEY ("productAssetId") REFERENCES "ProductAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingRuleSet" ADD CONSTRAINT "PricingRuleSet_productRevisionId_fkey" FOREIGN KEY ("productRevisionId") REFERENCES "ProductRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_pricingRuleSetId_fkey" FOREIGN KEY ("pricingRuleSetId") REFERENCES "PricingRuleSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Configuration" ADD CONSTRAINT "Configuration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Configuration" ADD CONSTRAINT "Configuration_productRevisionId_fkey" FOREIGN KEY ("productRevisionId") REFERENCES "ProductRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Configuration" ADD CONSTRAINT "Configuration_pricingRuleSetId_fkey" FOREIGN KEY ("pricingRuleSetId") REFERENCES "PricingRuleSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Configuration" ADD CONSTRAINT "Configuration_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfigurationOption" ADD CONSTRAINT "ConfigurationOption_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "Configuration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfigurationOption" ADD CONSTRAINT "ConfigurationOption_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "ProductOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfigurationDimension" ADD CONSTRAINT "ConfigurationDimension_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "Configuration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfigurationDimension" ADD CONSTRAINT "ConfigurationDimension_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "DimensionDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "Configuration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_pdfAssetId_fkey" FOREIGN KEY ("pdfAssetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLine" ADD CONSTRAINT "QuoteLine_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIRecommendation" ADD CONSTRAINT "AIRecommendation_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "Configuration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIRecommendation" ADD CONSTRAINT "AIRecommendation_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsyncJob" ADD CONSTRAINT "AsyncJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

