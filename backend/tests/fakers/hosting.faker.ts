import type { Prisma } from "@prisma/client";
import type { UserFakerReturnType } from "./user.faker";
import { faker } from "@faker-js/faker";
import { getPrismaClient } from "./prisma";

export class HostingFaker {
  static async create(
    override: {
      hostingOption: { id: string };
      application: { id: string };
      user: UserFakerReturnType;
    } & Omit<
      Partial<Prisma.HostingCreateInput>,
      "hostingOption" | "application" | "metadatas"
    >,
  ) {
    const prisma = getPrismaClient();

    const { hostingOption, application, user, ...restOverride } = override;

    return await prisma.hosting.create({
      data: {
        hostingOption: {
          connect: {
            id: hostingOption.id,
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
        label: faker.helpers.maybe(() => faker.commerce.productName()),
        ...restOverride,
      },
    });
  }
}
