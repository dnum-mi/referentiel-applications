import { PrismaClient } from '@prisma/client';

/**
 * Shared Prisma client instance for all fakers to avoid multiple connections.
 * This single instance is reused across all faker classes to prevent
 * "too many connections" errors when running tests.
 */
export const prisma = new PrismaClient();
