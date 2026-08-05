# Prisma Schema Design

**Status:** Normative database design, not generated implementation.  
The implementation task will translate this design into `packages/db/prisma/schema.prisma`, migrations, database-only partial indexes and repository adapters.

## Enumerations

```prisma
enum OrganizationStatus {
  ACTIVE
  SUSPENDED
  ARCHIVED
}

enum MembershipRole {
  OWNER
  ADMIN
  CATALOG_EDITOR
  SALES
  VIEWER
}

enum MembershipStatus {
  INVITED
  ACTIVE
  SUSPENDED
}

enum CatalogState {
  DRAFT
  PUBLISHED
  RETIRED
  ARCHIVED
}

enum SelectionMode {
  SINGLE
  MULTIPLE
}

enum DependencyKind {
  REQUIRES
  EXCLUDES
}

enum AssetKind {
  MODEL_3D
  IMAGE
  PDF
  OTHER
}

enum AssetStatus {
  UPLOADING
  PROCESSING
  READY
  REJECTED
  ARCHIVED
}

enum AssetRole {
  MODEL
  POSTER
  GALLERY
  DOCUMENT
  PDF_QUOTE
}

enum RuleKind {
  BASE
  OPTION
  DIMENSION
  LABOUR
  DELIVERY
  DISCOUNT
  TAX
  FEE
}

enum ConfigurationStatus {
  ACTIVE
  QUOTED
  ABANDONED
}

enum QuoteStatus {
  DRAFT
  ISSUED
  VIEWED
  CONTACTED
  ACCEPTED
  REJECTED
  EXPIRED
  VOID
}

enum ConsentPurpose {
  QUOTE_FOLLOW_UP
  MARKETING
  PRIVACY_POLICY
}

enum ConsentStatus {
  GRANTED
  WITHDRAWN
}

enum RecommendationStatus {
  GENERATED
  VERIFIED
  REJECTED
  FAILED
}

enum JobStatus {
  PENDING
  RUNNING
  SUCCEEDED
  FAILED
  DEAD
}
```

## Identity and organization models

```prisma
model Organization {
  id                 String             @id @default(uuid()) @db.Uuid
  slug               String             @unique
  canonicalHost      String             @unique
  legalName          String
  displayName        String
  defaultLocale      String
  supportedLocales   String[]
  timezone           String
  currency           String             @db.Char(3)
  quoteValidityDays  Int                @default(30)
  taxInclusive       Boolean            @default(false)
  brandConfig        Json
  legalConfig        Json
  status             OrganizationStatus @default(ACTIVE)
  version            Int                @default(1)
  createdAt          DateTime           @default(now()) @db.Timestamptz(3)
  updatedAt          DateTime           @updatedAt @db.Timestamptz(3)
  memberships        Membership[]
  categories         Category[]
  products           Product[]
  assets             Asset[]
  configurations     Configuration[]
  customers          Customer[]
  quotes             Quote[]
  auditEvents        AuditEvent[]
  jobs               AsyncJob[]
}

model User {
  id            String       @id @default(uuid()) @db.Uuid
  email         String       @unique
  name          String?
  emailVerified DateTime?    @db.Timestamptz(3)
  createdAt     DateTime     @default(now()) @db.Timestamptz(3)
  updatedAt     DateTime     @updatedAt @db.Timestamptz(3)
  memberships   Membership[]
}

model Membership {
  id             String           @id @default(uuid()) @db.Uuid
  organizationId String           @db.Uuid
  userId         String           @db.Uuid
  role           MembershipRole
  status         MembershipStatus @default(INVITED)
  version        Int              @default(1)
  invitedAt      DateTime?        @db.Timestamptz(3)
  acceptedAt     DateTime?        @db.Timestamptz(3)
  createdAt      DateTime         @default(now()) @db.Timestamptz(3)
  updatedAt      DateTime         @updatedAt @db.Timestamptz(3)
  organization   Organization     @relation(fields: [organizationId], references: [id], onDelete: Restrict)
  user           User             @relation(fields: [userId], references: [id], onDelete: Restrict)
  @@unique([organizationId, userId])
  @@index([userId, status])
}
```

## Catalog, asset and viewer models

```prisma
model Category {
  id             String       @id @default(uuid()) @db.Uuid
  organizationId String       @db.Uuid
  slug           String
  name           Json
  description    Json
  sortOrder      Int          @default(0)
  state          CatalogState @default(DRAFT)
  version        Int          @default(1)
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Restrict)
  products       Product[]
  createdAt      DateTime     @default(now()) @db.Timestamptz(3)
  updatedAt      DateTime     @updatedAt @db.Timestamptz(3)
  @@unique([organizationId, slug])
  @@index([organizationId, state, sortOrder])
}

model Product {
  id             String       @id @default(uuid()) @db.Uuid
  organizationId String       @db.Uuid
  categoryId     String       @db.Uuid
  slug           String
  state          CatalogState @default(DRAFT)
  version        Int          @default(1)
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Restrict)
  category       Category     @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  revisions      ProductRevision[]
  createdAt      DateTime     @default(now()) @db.Timestamptz(3)
  updatedAt      DateTime     @updatedAt @db.Timestamptz(3)
  @@unique([organizationId, slug])
  @@index([organizationId, categoryId, state])
}

model ProductRevision {
  id                 String       @id @default(uuid()) @db.Uuid
  productId          String       @db.Uuid
  revision           Int
  state              CatalogState @default(DRAFT)
  name               Json
  shortDescription   Json
  description        Json
  assumptions        Json
  exclusions         Json
  defaultVariantId   String?      @unique @db.Uuid
  viewerSchemaVersion Int         @default(1)
  publishedAt        DateTime?    @db.Timestamptz(3)
  publishFrom        DateTime?    @db.Timestamptz(3)
  publishUntil       DateTime?    @db.Timestamptz(3)
  contentChecksum    String
  version            Int          @default(1)
  product            Product      @relation(fields: [productId], references: [id], onDelete: Restrict)
  variants           ProductVariant[] @relation("RevisionVariants")
  defaultVariant     ProductVariant?   @relation("DefaultVariant", fields: [defaultVariantId], references: [id], onDelete: Restrict)
  optionGroups       OptionGroup[]
  dimensions         DimensionDefinition[]
  assets             ProductAsset[]
  pricingRuleSets    PricingRuleSet[]
  configurations     Configuration[]
  createdAt          DateTime     @default(now()) @db.Timestamptz(3)
  @@unique([productId, revision])
  @@index([productId, state, publishedAt])
}

model ProductVariant {
  id                String          @id @default(uuid()) @db.Uuid
  productRevisionId String          @db.Uuid
  code              String
  name              Json
  description       Json
  baseAmountMinor   BigInt
  currency          String          @db.Char(3)
  sortOrder         Int             @default(0)
  productRevision   ProductRevision @relation("RevisionVariants", fields: [productRevisionId], references: [id], onDelete: Cascade)
  defaultFor         ProductRevision? @relation("DefaultVariant")
  configurations    Configuration[]
  @@unique([productRevisionId, code])
}

model OptionGroup {
  id                String          @id @default(uuid()) @db.Uuid
  productRevisionId String          @db.Uuid
  code              String
  name              Json
  description       Json
  mode              SelectionMode
  minSelections     Int             @default(0)
  maxSelections     Int?
  sortOrder         Int             @default(0)
  productRevision   ProductRevision @relation(fields: [productRevisionId], references: [id], onDelete: Cascade)
  options           ProductOption[]
  @@unique([productRevisionId, code])
}

model ProductOption {
  id               String                @id @default(uuid()) @db.Uuid
  optionGroupId    String                @db.Uuid
  code             String
  name             Json
  description      Json
  state            CatalogState          @default(DRAFT)
  viewerMappingKey String?
  sortOrder        Int                   @default(0)
  optionGroup      OptionGroup           @relation(fields: [optionGroupId], references: [id], onDelete: Cascade)
  sourceDependencies OptionDependency[]  @relation("DependencySource")
  targetDependencies OptionDependency[]  @relation("DependencyTarget")
  selections       ConfigurationOption[]
  @@unique([optionGroupId, code])
}

model OptionDependency {
  id             String         @id @default(uuid()) @db.Uuid
  sourceOptionId String         @db.Uuid
  targetOptionId String         @db.Uuid
  kind           DependencyKind
  sourceOption   ProductOption  @relation("DependencySource", fields: [sourceOptionId], references: [id], onDelete: Cascade)
  targetOption   ProductOption  @relation("DependencyTarget", fields: [targetOptionId], references: [id], onDelete: Cascade)
  @@unique([sourceOptionId, targetOptionId, kind])
}

model DimensionDefinition {
  id                String          @id @default(uuid()) @db.Uuid
  productRevisionId String          @db.Uuid
  code              String
  label             Json
  unit              String
  minValue          Decimal         @db.Decimal(18, 6)
  maxValue          Decimal         @db.Decimal(18, 6)
  stepValue         Decimal         @db.Decimal(18, 6)
  defaultValue      Decimal?        @db.Decimal(18, 6)
  required          Boolean         @default(true)
  sortOrder         Int             @default(0)
  productRevision   ProductRevision @relation(fields: [productRevisionId], references: [id], onDelete: Cascade)
  values            ConfigurationDimension[]
  @@unique([productRevisionId, code])
}

model Asset {
  id             String       @id @default(uuid()) @db.Uuid
  organizationId String       @db.Uuid
  kind           AssetKind
  status         AssetStatus  @default(UPLOADING)
  storageKey     String       @unique
  fileName       String
  mimeType       String
  bytes          BigInt
  sha256         String
  metadata       Json
  errorCode      String?
  createdAt      DateTime     @default(now()) @db.Timestamptz(3)
  readyAt        DateTime?    @db.Timestamptz(3)
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Restrict)
  usages         ProductAsset[]
  quotePdfs      Quote[]      @relation("QuotePdf")
  @@index([organizationId, status, kind])
  @@index([organizationId, sha256])
}

model ProductAsset {
  id                String          @id @default(uuid()) @db.Uuid
  productRevisionId String          @db.Uuid
  assetId           String          @db.Uuid
  role              AssetRole
  sortOrder         Int             @default(0)
  isPrimary         Boolean         @default(false)
  viewerManifest    Json?
  productRevision   ProductRevision @relation(fields: [productRevisionId], references: [id], onDelete: Cascade)
  asset             Asset           @relation(fields: [assetId], references: [id], onDelete: Restrict)
  hotspots          Hotspot[]
  @@unique([productRevisionId, assetId, role])
  @@index([productRevisionId, role, sortOrder])
}

model Hotspot {
  id             String       @id @default(uuid()) @db.Uuid
  productAssetId String       @db.Uuid
  code           String
  label          Json
  detail         Json
  nodeKey        String?
  position       Json
  normal         Json?
  visibility     Json?
  focusCamera    Json?
  sortOrder      Int          @default(0)
  productAsset   ProductAsset @relation(fields: [productAssetId], references: [id], onDelete: Cascade)
  @@unique([productAssetId, code])
}
```

## Pricing, configuration, quote and operations models

```prisma
model PricingRuleSet {
  id                String          @id @default(uuid()) @db.Uuid
  productRevisionId String          @db.Uuid
  revision          Int
  state             CatalogState    @default(DRAFT)
  schemaVersion     Int             @default(1)
  currency          String          @db.Char(3)
  effectiveFrom     DateTime?       @db.Timestamptz(3)
  effectiveUntil    DateTime?       @db.Timestamptz(3)
  checksum          String
  publishedAt       DateTime?       @db.Timestamptz(3)
  version           Int             @default(1)
  productRevision   ProductRevision @relation(fields: [productRevisionId], references: [id], onDelete: Restrict)
  rules             PricingRule[]
  configurations    Configuration[]
  @@unique([productRevisionId, revision])
  @@index([productRevisionId, state, effectiveFrom])
}

model PricingRule {
  id               String         @id @default(uuid()) @db.Uuid
  pricingRuleSetId String         @db.Uuid
  code             String
  kind             RuleKind
  priority         Int
  label            Json
  condition        Json
  action           Json
  stackGroup       String?
  exclusiveInGroup Boolean        @default(false)
  taxClass         String?
  ruleSet          PricingRuleSet @relation(fields: [pricingRuleSetId], references: [id], onDelete: Cascade)
  @@unique([pricingRuleSetId, code])
  @@unique([pricingRuleSetId, priority, code])
}

model Configuration {
  id                String               @id @default(uuid()) @db.Uuid
  organizationId    String               @db.Uuid
  productRevisionId String               @db.Uuid
  pricingRuleSetId  String               @db.Uuid
  variantId         String               @db.Uuid
  locale            String
  status            ConfigurationStatus  @default(ACTIVE)
  budgetMinor       BigInt?
  sessionTokenHash  String               @unique
  version            Int                  @default(1)
  expiresAt          DateTime             @db.Timestamptz(3)
  createdAt          DateTime             @default(now()) @db.Timestamptz(3)
  updatedAt          DateTime             @updatedAt @db.Timestamptz(3)
  organization       Organization         @relation(fields: [organizationId], references: [id], onDelete: Restrict)
  productRevision    ProductRevision      @relation(fields: [productRevisionId], references: [id], onDelete: Restrict)
  pricingRuleSet     PricingRuleSet       @relation(fields: [pricingRuleSetId], references: [id], onDelete: Restrict)
  variant            ProductVariant       @relation(fields: [variantId], references: [id], onDelete: Restrict)
  options            ConfigurationOption[]
  dimensions         ConfigurationDimension[]
  quote              Quote?
  recommendations    AIRecommendation[]
  @@index([organizationId, status, expiresAt])
}

model ConfigurationOption {
  configurationId String        @db.Uuid
  optionId        String        @db.Uuid
  configuration   Configuration @relation(fields: [configurationId], references: [id], onDelete: Cascade)
  option          ProductOption @relation(fields: [optionId], references: [id], onDelete: Restrict)
  @@id([configurationId, optionId])
}

model ConfigurationDimension {
  configurationId String              @db.Uuid
  definitionId    String              @db.Uuid
  value           Decimal             @db.Decimal(18, 6)
  unit            String
  configuration   Configuration       @relation(fields: [configurationId], references: [id], onDelete: Cascade)
  definition      DimensionDefinition @relation(fields: [definitionId], references: [id], onDelete: Restrict)
  @@id([configurationId, definitionId])
}

model Customer {
  id             String       @id @default(uuid()) @db.Uuid
  organizationId String       @db.Uuid
  email          String
  name           String
  phone          String?
  locale         String
  version        Int          @default(1)
  anonymizedAt   DateTime?    @db.Timestamptz(3)
  createdAt      DateTime     @default(now()) @db.Timestamptz(3)
  updatedAt      DateTime     @updatedAt @db.Timestamptz(3)
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Restrict)
  quotes         Quote[]
  consents       ConsentRecord[]
  @@index([organizationId, email])
}

model Quote {
  id                    String      @id @default(uuid()) @db.Uuid
  organizationId        String      @db.Uuid
  configurationId       String      @unique @db.Uuid
  customerId            String      @db.Uuid
  quoteNumber           String
  status                QuoteStatus @default(ISSUED)
  currency              String      @db.Char(3)
  subtotalMinor         BigInt
  discountMinor         BigInt
  taxMinor              BigInt
  totalMinor            BigInt
  configurationSnapshot Json
  catalogSnapshot       Json
  pricingSnapshot       Json
  traceChecksum         String
  publicTokenHash       String?     @unique
  publicTokenExpiresAt  DateTime?   @db.Timestamptz(3)
  publicTokenRevokedAt  DateTime?   @db.Timestamptz(3)
  pdfAssetId            String?     @db.Uuid
  idempotencyKeyHash    String
  version               Int         @default(1)
  issuedAt              DateTime    @default(now()) @db.Timestamptz(3)
  expiresAt             DateTime    @db.Timestamptz(3)
  organization          Organization @relation(fields: [organizationId], references: [id], onDelete: Restrict)
  configuration         Configuration @relation(fields: [configurationId], references: [id], onDelete: Restrict)
  customer              Customer     @relation(fields: [customerId], references: [id], onDelete: Restrict)
  pdfAsset              Asset?       @relation("QuotePdf", fields: [pdfAssetId], references: [id], onDelete: Restrict)
  lines                 QuoteLine[]
  consents              ConsentRecord[]
  recommendations       AIRecommendation[]
  @@unique([organizationId, quoteNumber])
  @@unique([organizationId, idempotencyKeyHash])
  @@index([organizationId, issuedAt(sort: Desc)])
  @@index([organizationId, status])
}

model QuoteLine {
  id              String   @id @default(uuid()) @db.Uuid
  quoteId         String   @db.Uuid
  sortOrder       Int
  code            String
  kind            RuleKind
  label           String
  quantity        Decimal  @db.Decimal(18, 6)
  unit            String?
  unitAmountMinor BigInt
  netAmountMinor  BigInt
  taxAmountMinor  BigInt
  totalAmountMinor BigInt
  taxClass        String?
  source          Json
  quote           Quote    @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  @@unique([quoteId, sortOrder])
  @@index([quoteId, kind])
}

model ConsentRecord {
  id            String         @id @default(uuid()) @db.Uuid
  customerId    String         @db.Uuid
  quoteId       String?        @db.Uuid
  purpose       ConsentPurpose
  status        ConsentStatus
  policyVersion String
  source        String
  evidence      Json
  recordedAt    DateTime       @default(now()) @db.Timestamptz(3)
  customer      Customer       @relation(fields: [customerId], references: [id], onDelete: Restrict)
  quote         Quote?         @relation(fields: [quoteId], references: [id], onDelete: Restrict)
  @@index([customerId, purpose, recordedAt])
}

model AIRecommendation {
  id              String               @id @default(uuid()) @db.Uuid
  configurationId String               @db.Uuid
  quoteId         String?              @db.Uuid
  status          RecommendationStatus
  promptVersion   String
  provider        String
  model           String
  inputHash       String
  contextChecksum String
  output          Json?
  citedEntityIds  String[]
  verification    Json
  inputTokens     Int?
  outputTokens    Int?
  costMicros      BigInt?
  latencyMs       Int?
  expiresAt       DateTime             @db.Timestamptz(3)
  createdAt       DateTime             @default(now()) @db.Timestamptz(3)
  configuration   Configuration        @relation(fields: [configurationId], references: [id], onDelete: Restrict)
  quote           Quote?               @relation(fields: [quoteId], references: [id], onDelete: Restrict)
  @@index([configurationId, createdAt])
  @@index([inputHash, promptVersion, model])
}

model AuditEvent {
  id             String       @id @default(uuid()) @db.Uuid
  organizationId String       @db.Uuid
  actorUserId    String?      @db.Uuid
  action         String
  resourceType   String
  resourceId     String
  correlationId  String
  changeSummary  Json
  context        Json
  occurredAt     DateTime     @default(now()) @db.Timestamptz(3)
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Restrict)
  @@index([organizationId, occurredAt(sort: Desc)])
  @@index([organizationId, resourceType, resourceId])
}

model AsyncJob {
  id               String       @id @default(uuid()) @db.Uuid
  organizationId   String       @db.Uuid
  type             String
  status           JobStatus    @default(PENDING)
  deduplicationKey String
  payload          Json
  attempts         Int          @default(0)
  maxAttempts      Int          @default(5)
  availableAt      DateTime     @default(now()) @db.Timestamptz(3)
  lockedAt         DateTime?    @db.Timestamptz(3)
  lockedBy         String?
  errorCode        String?
  version          Int          @default(1)
  createdAt        DateTime     @default(now()) @db.Timestamptz(3)
  updatedAt        DateTime     @updatedAt @db.Timestamptz(3)
  organization     Organization @relation(fields: [organizationId], references: [id], onDelete: Restrict)
  @@unique([organizationId, type, deduplicationKey])
  @@index([status, availableAt])
}
```

## Migration-only database controls

Prisma schema syntax cannot express every invariant. SQL migrations must add checks for non-negative asset bytes, positive quote validity, dimension bounds/steps, quote arithmetic consistency, effective interval ordering, JSON schema version presence and case-insensitive normalized email indexes. Publication transactions enforce one active published product revision/rule set and one default variant using partial unique indexes or serializable locking.
