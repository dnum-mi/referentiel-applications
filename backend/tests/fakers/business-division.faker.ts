import { faker } from "@faker-js/faker";
import { getPrismaClient } from "./prisma";

export class BusinessDivisionFaker {
  static async create() {
    const prisma = getPrismaClient();

    const label = faker.word
      .noun({ length: { min: 2, max: 128 } })
      .replace(/[^a-z._-]/g, "");

    // Upsert to avoid failures when the generated name already exists
    return await prisma.businessDivision.upsert({
      where: { label },
      update: {},
      create: { label },
    });
  }
}
