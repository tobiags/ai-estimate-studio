import {
  buildAllowlistedContext,
  type BuiltAiContext,
  type ContextEntity,
} from "@ai-estimate-studio/ai";

export type AiContextScope = Readonly<{ organizationId: string }>;

export type AiContextEntityStore = Readonly<{
  listForRevision(
    scope: AiContextScope,
    input: Readonly<{ revisionId: string; locale: string }>,
  ): Promise<readonly ContextEntity[]>;
}>;

export type BuildAiContextInput = Readonly<{
  revisionId: string;
  locale: string;
  goal?: string;
}>;

/**
 * Orchestrates tenant-scoped retrieval and the provider-neutral context
 * builder. Persistence implementations must enforce organization scope.
 */
export class AiContextApplicationService {
  constructor(
    private readonly store: AiContextEntityStore,
    private readonly maxEntities = 64,
  ) {}

  async build(
    scope: AiContextScope,
    input: BuildAiContextInput,
  ): Promise<BuiltAiContext> {
    const entities = await this.store.listForRevision(scope, {
      revisionId: input.revisionId,
      locale: input.locale,
    });
    return buildAllowlistedContext({ ...input, entities }, this.maxEntities);
  }
}
