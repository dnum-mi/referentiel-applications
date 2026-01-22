import type { UserFakerReturnType } from "./user.faker";
import { faker } from "@faker-js/faker";
import { getPrismaClient } from "./prisma";

export class TechnicalDebtInfoFaker {
  static async create(override: {
    application: { id: string };
    user: UserFakerReturnType;
    technicalMaturity?: number | null;
    businessMaturity?: number | null;
    costMaturity?: number | null;
  }) {
    const prisma = getPrismaClient();

    const { application, user, ...restOverride } = override;

    return await prisma.technicalDebtInfo.create({
      data: {
        application: {
          connect: {
            id: application.id,
          },
        },
        metadatas: {
          create: {
            createdById: user.id,
            applicationId: application.id,
            description: "Ajout des informations de dette technique",
          },
        },
        technicalMaturity:
          restOverride.technicalMaturity ??
          faker.helpers.maybe(() =>
            faker.number.float({ min: 0, max: 5, multipleOf: 0.01 }),
          ),
        businessMaturity:
          restOverride.businessMaturity ??
          faker.helpers.maybe(() =>
            faker.number.float({ min: 0, max: 5, multipleOf: 0.01 }),
          ),
        costMaturity:
          restOverride.costMaturity ??
          faker.helpers.maybe(() =>
            faker.number.float({ min: 0, max: 5, multipleOf: 0.01 }),
          ),
      },
    });
  }
}
