import { priorityRestart } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { getPrismaClient } from './prisma';

const appTags = [
  'WEB',
  'MOBILE',
  'API',
  'DESKTOP',
  'CLOUD',
  'DATABASE',
  'MICROSERVICE',
  'FRONTEND',
  'BACKEND',
  'FULLSTACK',
  'ANALYTICS',
  'MONITORING',
  'SECURITY',
  'INTEGRATION',
  'LEGACY',
  'MODERN',
  'CRITICAL',
  'INTERNAL',
  'EXTERNAL',
  'DEVELOPMENT',
  'PRODUCTION',
  'STAGING',
  'TEST',
  'BUSINESS',
  'TECHNICAL',
];

const restartPriorities = Object.values(priorityRestart);

export class ApplicationFaker {
  static async create(user) {
    const prisma = getPrismaClient();

    return await prisma.application.create({
      data: {
        label: faker.company.name(),
        shortName: faker.company.name(),
        description: faker.company.catchPhrase(),
        tags: faker.helpers.arrayElements(appTags, { min: 1, max: 3 }),
        priorityRestart: faker.helpers.arrayElement(restartPriorities),
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
        quality: faker.number.int({ min: 10, max: 100 }),
      },
    });
  }
}
