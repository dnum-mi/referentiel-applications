import { Prisma, PrismaClient } from '@prisma/client';
import { DefaultArgs } from '@prisma/client/runtime/library';

/**
 * Shared Prisma client instance for all fakers to avoid multiple connections.
 * This single instance is reused across all faker classes to prevent
 * "too many connections" errors when running tests.
 */
let prisma: PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs> =
  undefined;
export function getPrismaClient() {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}
