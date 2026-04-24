import { PrismaClient } from "@prisma/client";
import { fakerFR as faker } from "@faker-js/faker";

const prisma = new PrismaClient();

export class FamilyFaker {
  static async create() {
    const label = faker.commerce.department();

    return await prisma.family.upsert({
      where: { label: label },
      update: {},
      create: {
        label: label,
      },
    });
  }
}
