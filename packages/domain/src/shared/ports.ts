import type { AuditEvent } from "../audit/model.js";
import type { Category, Product, ProductRevision } from "../catalog/model.js";
import type { Configuration } from "../configuration/model.js";
import type { Customer } from "../customer/model.js";
import type { Organization } from "../organization/model.js";
import type { Quote } from "../quote/model.js";
import type {
  CategoryId,
  ConfigurationId,
  CustomerId,
  OrganizationId,
  ProductId,
  ProductRevisionId,
  QuoteId,
  UserId,
} from "./ids.js";
import type { Version } from "./revision.js";

export type OrganizationScope = Readonly<{ organizationId: OrganizationId }>;
export type PageRequest = Readonly<{ limit: number; cursor?: string }>;
export type Page<T> = Readonly<{ items: readonly T[]; nextCursor?: string }>;

export interface OrganizationRepository {
  findById(id: OrganizationId): Promise<Organization | null>;
  findByHost(canonicalHost: string): Promise<Organization | null>;
  update(
    id: OrganizationId,
    expectedVersion: Version,
    input: Partial<Organization>,
  ): Promise<Organization>;
}

export interface CatalogRepository {
  findCategory(
    scope: OrganizationScope,
    id: CategoryId,
  ): Promise<Category | null>;
  listCategories(
    scope: OrganizationScope,
    page: PageRequest,
  ): Promise<Page<Category>>;
  findProduct(scope: OrganizationScope, id: ProductId): Promise<Product | null>;
  findRevision(
    scope: OrganizationScope,
    id: ProductRevisionId,
  ): Promise<ProductRevision | null>;
}

export interface ConfigurationRepository {
  findById(
    scope: OrganizationScope,
    id: ConfigurationId,
  ): Promise<Configuration | null>;
  save(
    scope: OrganizationScope,
    configuration: Configuration,
    expectedVersion?: Version,
  ): Promise<Configuration>;
}

export interface CustomerRepository {
  findById(scope: OrganizationScope, id: CustomerId): Promise<Customer | null>;
  findByEmail(
    scope: OrganizationScope,
    normalizedEmail: string,
  ): Promise<Customer | null>;
  save(
    scope: OrganizationScope,
    customer: Customer,
    expectedVersion?: Version,
  ): Promise<Customer>;
}

export interface QuoteRepository {
  findById(scope: OrganizationScope, id: QuoteId): Promise<Quote | null>;
  list(scope: OrganizationScope, page: PageRequest): Promise<Page<Quote>>;
  save(
    scope: OrganizationScope,
    quote: Quote,
    expectedVersion?: Version,
  ): Promise<Quote>;
}

export interface AuditEventWriter {
  append(scope: OrganizationScope, event: AuditEvent): Promise<void>;
}

export interface TransactionPort {
  run<T>(work: () => Promise<T>): Promise<T>;
}

export interface ClockPort {
  now(): string;
}

export interface IdGeneratorPort {
  uuid(): string;
}

export interface ObjectStoragePort {
  createUpload(
    input: Readonly<{
      key: string;
      contentType: string;
      maxBytes: bigint;
      expiresAt: string;
    }>,
  ): Promise<Readonly<{ uploadUrl: string; key: string }>>;
  head(key: string): Promise<Readonly<{
    contentType: string;
    sizeBytes: bigint;
    sha256: string;
  }> | null>;
}

export interface EmailPort {
  send(
    input: Readonly<{
      to: string;
      template: string;
      variables: Readonly<Record<string, string>>;
    }>,
  ): Promise<void>;
}

export interface AIProviderPort {
  complete(
    input: Readonly<{
      model: string;
      systemPrompt: string;
      userPrompt: string;
      contextHash: string;
    }>,
  ): Promise<
    Readonly<{
      output: string;
      providerRequestId: string;
      inputTokens?: number;
      outputTokens?: number;
    }>
  >;
}

export interface AuthIdentityPort {
  findUserByEmail(
    email: string,
  ): Promise<Readonly<{ userId: UserId; email: string }> | null>;
}
