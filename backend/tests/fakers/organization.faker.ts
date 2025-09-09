import { getPrismaClient } from "./prisma";
import { faker } from "@faker-js/faker";

export class OrganizationFaker {
  static async create() {
    const prisma = getPrismaClient();

    return await prisma.organization.create({
      data: {
        label: faker.company.name(),
        url: faker.internet.url(),
        sigle: faker.string.alpha({ length: 4, casing: "upper" }),
      },
    });
  }
}
