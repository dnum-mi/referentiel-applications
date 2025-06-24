import { faker } from '@faker-js/faker';
import { prisma } from './prisma';

export class HostingFaker {
  static async create(override: {
    hostingOption: { id: string };
    application: { id: string };
    user: { keycloakId: string };
    [key: string]: any;
  }) {
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
            createdById: user.keycloakId,
            applicationId: application.id,
          },
        },
        label: faker.helpers.maybe(() => faker.commerce.productName()),
        ...restOverride,
      },
    });
  }
}
