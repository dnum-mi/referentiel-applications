import { faker } from "@faker-js/faker";
import { getPrismaClient } from "./prisma";

export class TagFaker {
  static async create() {
    const prisma = getPrismaClient();

    const name = faker.word
      .noun({ length: { min: 2, max: 128 } })
      .replace(/[^a-z._-]/g, "");

    // Upsert to avoid failures when the generated name already exists
    return await prisma.tag.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
}
