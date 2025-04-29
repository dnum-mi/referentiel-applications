import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

export class ProviderFaker {
  static async create(
    overrides: Partial<{ name: string; description: string }> = {},
  ) {
    return await prisma.provider.create({
      data: {
        name: overrides.name || `Provider-${uuidv4().substring(0, 8)}`,
        description:
          overrides.description ||
          `Description for provider ${uuidv4().substring(0, 8)}`,
      },
    });
  }
}
