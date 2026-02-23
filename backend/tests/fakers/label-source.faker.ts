import { faker } from "@faker-js/faker";
import { getPrismaClient } from "./prisma";

export class LabelSourceFaker {
  static async create() {
    const prisma = getPrismaClient();

    const source = faker.string.alpha({ length: 6 }).toUpperCase();

    return await prisma.labelSource.upsert({
      where: { source },
      update: {},
      create: { source },
    });
  }
}
