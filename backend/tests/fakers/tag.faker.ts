import { faker } from "@faker-js/faker";
import { getPrismaClient } from "./prisma";

export class TagFaker {
  static async create() {
    const prisma = getPrismaClient();

    return await prisma.tag.create({
      data: {
        name: `${faker.word.noun({ length: { min: 2, max: 128 } }).replace(/[^a-z._-]/g, "")}`,
      },
    });
  }
}
