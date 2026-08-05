import {
  PricingApplicationError,
  type PricingApplicationService,
  type PricingRepository,
  type PricingRuleSetDocument,
} from "@ai-estimate-studio/application";
import { DomainError } from "@ai-estimate-studio/domain";
import {
  pricingDraftRequestSchema,
  pricingPublicationRequestSchema,
  pricingScenarioRequestSchema,
  pricingRuleSetIdSchema,
  type PricingDraftRequest,
  type PricingPublicationRequest,
  type PricingScenarioRequest,
} from "@ai-estimate-studio/contracts";
import type {
  PricingFacts,
  PricingValidationInput,
} from "@ai-estimate-studio/pricing-engine";
import { isResponse, readJson, safeRoute } from "./route";
import { problemResponse } from "./problems";

type Scope = Readonly<{ organizationId: string }>;

export type PricingRouteDependencies = Readonly<{
  repository: Pick<PricingRepository, "find">;
  service: Pick<
    PricingApplicationService,
    "updateDraft" | "simulate" | "publish"
  >;
  resolveScope(request: Request): Promise<Scope>;
  assertCsrf?(request: Request, scope: Scope): Promise<void>;
}>;

function errorResponse(error: unknown): Response {
  if (error instanceof PricingApplicationError)
    return problemResponse({
      title:
        error.code === "CONFLICT"
          ? "Pricing conflict"
          : "Pricing validation failed",
      status: error.code === "CONFLICT" ? 409 : 422,
      type: `https://ai-estimate-studio.dev/problems/pricing-${error.code.toLowerCase()}`,
    });
  if (error instanceof DomainError)
    return problemResponse({
      title:
        error.code === "VERSION_CONFLICT"
          ? "Pricing conflict"
          : "Pricing resource not found",
      status: error.code === "VERSION_CONFLICT" ? 409 : 404,
      type: `https://ai-estimate-studio.dev/problems/pricing-${error.code.toLowerCase()}`,
    });
  throw error;
}

async function documentOr404(
  repository: Pick<PricingRepository, "find">,
  scope: Scope,
  id: string,
): Promise<PricingRuleSetDocument | Response> {
  const document = await repository.find(scope, id);
  return (
    document ??
    problemResponse({ title: "Pricing rule set not found", status: 404 })
  );
}

function response(document: PricingRuleSetDocument): Response {
  return Response.json(document, { headers: { "cache-control": "no-store" } });
}

export function createPricingHandlers(dependencies: PricingRouteDependencies) {
  const scopeFor = (request: Request) => dependencies.resolveScope(request);
  return {
    get: (request: Request, id: string) =>
      safeRoute(async () => {
        if (!pricingRuleSetIdSchema.safeParse(id).success)
          return problemResponse({
            title: "Invalid pricing rule set ID",
            status: 422,
          });
        const scope = await scopeFor(request);
        const document = await documentOr404(
          dependencies.repository,
          scope,
          id,
        );
        return document instanceof Response ? document : response(document);
      }),
    patch: (request: Request, id: string) =>
      safeRoute(async () => {
        const parsed = await readJson<PricingDraftRequest>(
          request,
          pricingDraftRequestSchema,
        );
        if (isResponse(parsed)) return parsed;
        const scope = await scopeFor(request);
        await dependencies.assertCsrf?.(request, scope);
        const current = await documentOr404(dependencies.repository, scope, id);
        if (current instanceof Response) return current;
        try {
          const updated = await dependencies.service.updateDraft(
            scope,
            current,
            {
              schemaVersion: parsed.schemaVersion,
              currency: parsed.currency,
              rules: parsed.rules as PricingDraftRequest["rules"] as never,
              validation: parsed.validation as PricingValidationInput,
            },
          );
          return response(updated);
        } catch (error) {
          return errorResponse(error);
        }
      }),
    simulate: (request: Request, id: string) =>
      safeRoute(async () => {
        const parsed = await readJson<PricingScenarioRequest>(
          request,
          pricingScenarioRequestSchema,
        );
        if (isResponse(parsed)) return parsed;
        const scope = await scopeFor(request);
        const current = await documentOr404(dependencies.repository, scope, id);
        if (current instanceof Response) return current;
        try {
          const result = await dependencies.service.simulate(current, {
            name: parsed.name,
            facts: parsed.facts as PricingFacts,
          });
          return Response.json(result, {
            headers: { "cache-control": "no-store" },
          });
        } catch (error) {
          return errorResponse(error);
        }
      }),
    publish: (request: Request, id: string) =>
      safeRoute(async () => {
        const parsed = await readJson<PricingPublicationRequest>(
          request,
          pricingPublicationRequestSchema,
        );
        if (isResponse(parsed)) return parsed;
        const scope = await scopeFor(request);
        await dependencies.assertCsrf?.(request, scope);
        const current = await documentOr404(dependencies.repository, scope, id);
        if (current instanceof Response) return current;
        try {
          const published = await dependencies.service.publish(
            scope,
            current,
            parsed.scenarios.map((scenario) => ({
              name: scenario.name,
              facts: scenario.facts as PricingFacts,
            })),
            parsed.effectiveFrom,
            parsed.effectiveUntil,
          );
          return response(published);
        } catch (error) {
          return errorResponse(error);
        }
      }),
  };
}
