import { PrismaClient } from "@prisma/client";

declare global {
  var __aiEstimateStudioPrisma: PrismaClient | undefined;
}

function createClient(): PrismaClient {
  return new PrismaClient();
}

export const prisma = globalThis.__aiEstimateStudioPrisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__aiEstimateStudioPrisma = prisma;
}
