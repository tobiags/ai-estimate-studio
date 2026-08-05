import { describe, expect, it } from "vitest";
import {
  AiContextApplicationService,
  type AiContextEntityStore,
} from "./context-service.js";

describe("AiContextApplicationService", () => {
  it("retrieves by tenant and revision, then returns a bounded snapshot", async () => {
    const calls: Array<{
      organizationId: string;
      revisionId: string;
      locale: string;
    }> = [];
    const store: AiContextEntityStore = {
      async listForRevision(scope, input) {
        calls.push({
          organizationId: scope.organizationId,
          revisionId: input.revisionId,
          locale: input.locale,
        });
        return [
          {
            entityType: "OPTION",
            entityId: "option-a",
            revisionId: "revision-a",
            label: "Basic",
            deltaMinor: "200",
          },
          {
            entityType: "OPTION",
            entityId: "other-revision",
            revisionId: "revision-b",
            label: "Unrelated",
            deltaMinor: "1",
          },
        ];
      },
    };

    const context = await new AiContextApplicationService(store, 1).build(
      { organizationId: "org-a" },
      { revisionId: "revision-a", locale: "fr", goal: "lower cost" },
    );

    expect(calls).toEqual([
      { organizationId: "org-a", revisionId: "revision-a", locale: "fr" },
    ]);
    expect(context.entities.map((entity) => entity.entityId)).toEqual([
      "option-a",
    ]);
    expect(context.text).toContain("<catalog_context>");
    expect(context.checksum).toContain("revision-a");
  });

  it("keeps policy rejection at the application boundary", async () => {
    const store: AiContextEntityStore = {
      async listForRevision() {
        return [];
      },
    };

    await expect(
      new AiContextApplicationService(store).build(
        { organizationId: "org-a" },
        {
          revisionId: "revision-a",
          locale: "en",
          goal: "contact ada@example.test",
        },
      ),
    ).rejects.toThrow("Customer contact data");
  });
});
