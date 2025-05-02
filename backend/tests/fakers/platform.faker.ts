import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { ProviderFaker } from './provider.faker';
import { HostingSiteFaker } from './hosting-site.faker';

const prisma = new PrismaClient();

export class PlatformFaker {
  static async create(
    overrides: Partial<{
      name: string;
      description: string;
      providerId: string;
      hostingSiteId: string;
    }> = {},
  ) {
    const providerId =
      overrides.providerId || (await ProviderFaker.create()).id;
    const hostingSiteId =
      overrides.hostingSiteId || (await HostingSiteFaker.create()).id;

    return await prisma.platform.create({
      data: {
        name: overrides.name || `Platform-${uuidv4().substring(0, 8)}`,
        description:
          overrides.description ||
          `Description for platform ${uuidv4().substring(0, 8)}`,
        providerId,
        hostingSiteId,
      },
    });
  }
}
