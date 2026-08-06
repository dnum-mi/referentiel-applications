import { faker } from "@faker-js/faker";
import { getPrismaClient } from "./prisma";

export class OrganizationFaker {
  static async create({ path }: { path?: string } = {}) {
    const prisma = getPrismaClient();

    return await prisma.organization.create({
      data: {
        path: path ?? faker.company.name(),
        url: faker.internet.url(),
        sigle: faker.string.alpha({ length: 4, casing: "upper" }),
      },
    });
  }
}
