import { priorityRestart } from "@prisma/client";
import { faker } from "@faker-js/faker";
import { getPrismaClient } from "./prisma";
import type { AsyncReturnType } from "src/utils/types.util";
import type { UserFaker } from "./user.faker";

const appTags = [
  "WEB",
  "MOBILE",
  "API",
  "DESKTOP",
  "CLOUD",
  "DATABASE",
  "MICROSERVICE",
  "FRONTEND",
  "BACKEND",
  "FULLSTACK",
  "ANALYTICS",
  "MONITORING",
  "SECURITY",
  "INTEGRATION",
  "LEGACY",
  "MODERN",
  "CRITICAL",
  "INTERNAL",
  "EXTERNAL",
  "DEVELOPMENT",
  "PRODUCTION",
  "STAGING",
  "TEST",
  "BUSINESS",
  "TECHNICAL",
];

const restartPriorities = Object.values(priorityRestart);
export class ApplicationFaker {
  static async create(user: AsyncReturnType<typeof UserFaker.create>) {
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
            id: user.id,
          },
        },
        metadatas: {
          create: [
            {
              createdById: user.id,
            },
          ],
        },
        quality: faker.number.int({ min: 10, max: 100 }),
      },
    });
  }

  static async delete(applicationId: string) {
    const prisma = getPrismaClient();
    return prisma.application.delete({ where: { id: applicationId } });
  }
}
