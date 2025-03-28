import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ApplicationFaker {
  static async create(user) {
    return await prisma.application.create({
      data: {
        label: 'Test Application',
        description: 'Test Application Description',
        owner: {
          connect: {
            keycloakId: user.keycloakId,
          },
        },
        metadata: {
          create: {
            createdById: user.keycloakId,
            updatedById: user.keycloakId,
          },
        },
      },
    });
  }
}
