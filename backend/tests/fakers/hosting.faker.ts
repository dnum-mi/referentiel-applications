import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class HostingFaker {
  static async create(application: { id: string }) {
    return await prisma.hosting.create({
      data: {
        provider: 'Provider',
        label: 'label Hosting',
        region: 'us-east-1',
        site: 'example.com',
        nature: 'CLOUD',
        platform: 'EC2',
        application: {
          connect: {
            id: application.id,
          },
        },
      },
    });
  }
}
