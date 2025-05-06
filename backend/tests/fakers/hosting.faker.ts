import { PrismaClient, Nature } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

export class HostingFaker {
  static async create(override: {
    hostingOption: { id: string };
    application: { id: string };
    [key: string]: any;
  }) {
    const { hostingOption, application, ...restOverride } = override;

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
        label: faker.helpers.maybe(() => faker.commerce.productName()),
        region: faker.helpers.maybe(() => faker.location.state()),
        nature: faker.helpers.maybe(() =>
          faker.helpers.arrayElement(Object.values(Nature)),
        ),
        ...restOverride,
      },
    });
  }
}
