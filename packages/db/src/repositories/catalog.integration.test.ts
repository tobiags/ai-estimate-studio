import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { VersionConflictError } from "@ai-estimate-studio/domain";
import { prisma } from "../client.js";
import { PrismaCatalogRepository } from "./catalog.js";
import { transactions } from "../transaction.js";

const databaseAvailable = Boolean(process.env.DATABASE_URL);

describe.skipIf(!databaseAvailable)("Prisma catalog repositories", () => {
  const repository = new PrismaCatalogRepository(prisma);
  const organizationA = randomUUID();
  const organizationB = randomUUID();
  const scopeA = { organizationId: organizationA } as const;
  const scopeB = { organizationId: organizationB } as const;
  let categoryA: Awaited<ReturnType<typeof repository.createCategory>>;

  it("isolates tenant reads and permits tenant-local duplicate slugs", async () => {
    await prisma.organization.createMany({
      data: [
        {
          id: organizationA,
          slug: `tenant-a-${organizationA.slice(0, 8)}`,
          canonicalHost: `a-${organizationA.slice(0, 8)}.example.test`,
          legalName: "Tenant A",
          displayName: "Tenant A",
          defaultLocale: "en",
          supportedLocales: ["en"],
          timezone: "UTC",
          currency: "EUR",
          brandConfig: {},
          legalConfig: {},
        },
        {
          id: organizationB,
          slug: `tenant-b-${organizationB.slice(0, 8)}`,
          canonicalHost: `b-${organizationB.slice(0, 8)}.example.test`,
          legalName: "Tenant B",
          displayName: "Tenant B",
          defaultLocale: "en",
          supportedLocales: ["en"],
          timezone: "UTC",
          currency: "EUR",
          brandConfig: {},
          legalConfig: {},
        },
      ],
    });
    categoryA = await repository.createCategory(scopeA, {
      slug: "garden",
      name: { en: "Garden" },
      description: { en: "Tenant A" },
    });
    const categoryB = await repository.createCategory(scopeB, {
      slug: "garden",
      name: { en: "Garden" },
      description: { en: "Tenant B" },
    });

    expect(
      (await repository.listCategories(scopeA, { limit: 10 })).items.map(
        (item) => item.id,
      ),
    ).toEqual([categoryA.id]);
    expect(await repository.findCategory(scopeB, categoryA.id)).toBeNull();
    expect(await repository.findCategory(scopeA, categoryB.id)).toBeNull();
  });

  it("enforces optimistic versions and rolls back transaction work", async () => {
    const updated = await repository.updateCategory(
      scopeA,
      categoryA.id,
      categoryA.version,
      {
        description: { en: "Updated" },
      },
    );
    expect(updated.version).toBe(2);
    await expect(
      repository.updateCategory(scopeA, categoryA.id, categoryA.version, {
        slug: "stale",
      }),
    ).rejects.toBeInstanceOf(VersionConflictError);

    const rollbackId = randomUUID();
    await expect(
      transactions.run(async (tx) => {
        await tx.organization.create({
          data: {
            id: rollbackId,
            slug: `rollback-${rollbackId.slice(0, 8)}`,
            canonicalHost: `rollback-${rollbackId.slice(0, 8)}.example.test`,
            legalName: "Rollback",
            displayName: "Rollback",
            defaultLocale: "en",
            supportedLocales: ["en"],
            timezone: "UTC",
            currency: "EUR",
            brandConfig: {},
            legalConfig: {},
          },
        });
        throw new Error("rollback probe");
      }),
    ).rejects.toThrow("rollback probe");
    expect(
      await prisma.organization.findUnique({ where: { id: rollbackId } }),
    ).toBeNull();
  });

  it("cleans up only the fixture tenants", async () => {
    await prisma.category.deleteMany({
      where: { organizationId: { in: [organizationA, organizationB] } },
    });
    await prisma.organization.deleteMany({
      where: { id: { in: [organizationA, organizationB] } },
    });
  });
});
