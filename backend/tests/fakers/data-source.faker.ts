import type { UserFakerReturnType } from "./user.faker";
import { faker } from "@faker-js/faker";
import { getPrismaClient } from "./prisma";

export class DataSourceFaker {
  static async create(override: {
    application: { id: string };
    type: { id: string };
    sensibility: { id: string };
    family: { id: string };
    updateFrequency: { id: string };
    user: UserFakerReturnType;
    [key: string]: any;
  }) {
    const prisma = getPrismaClient();

    const {
      type,
      sensibility,
      family,
      updateFrequency,
      application,
      user,
      ...restOverride
    } = override;

    return await prisma.dataSource.create({
      data: {
        name: faker.database.collation(),
        type: {
          connect: {
            id: type.id,
          },
        },
        sensibility: {
          connect: {
            id: sensibility.id,
          },
        },
        family: {
          connect: {
            id: family.id,
          },
        },
        updateFrequency: {
          connect: {
            id: updateFrequency.id,
          },
        },
        application: {
          connect: {
            id: application.id,
          },
        },
        metadatas: {
          create: {
            createdById: user.id,
            applicationId: application.id,
          },
        },
        ...restOverride,
      },
    });
  }
}
