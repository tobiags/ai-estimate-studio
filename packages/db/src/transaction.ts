import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import type { TransactionPort } from "@ai-estimate-studio/domain";
import { prisma } from "./client.js";

export type PrismaTransactionClient = Prisma.TransactionClient;

export class PrismaTransactionPort implements TransactionPort<PrismaTransactionClient> {
  constructor(private readonly client: PrismaClient = prisma) {}

  run<T>(
    work: (transaction: PrismaTransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.client.$transaction(work, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }
}

export const transactions = new PrismaTransactionPort();
