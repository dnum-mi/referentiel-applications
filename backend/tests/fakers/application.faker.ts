import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { prisma } from './prisma';

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
        metadatas: {
          create: [
            {
              createdById: user.keycloakId,
            },
          ],
        },
      },
    });
  }
}
