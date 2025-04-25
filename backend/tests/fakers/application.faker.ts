import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

export class ApplicationFaker {
  static async create(user) {
    return await prisma.application.create({
      data: {
        label: faker.company.name(),
        description: faker.company.catchPhrase(),
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
