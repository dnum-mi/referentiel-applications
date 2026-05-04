import { faker } from "@faker-js/faker";
import { getPrismaClient } from "./prisma";

export class SensibilityFaker {
  static async create() {
    const prisma = getPrismaClient();

    const sensibilities = [
      { label: "Sensible", color: "red" },
      { label: "RGPD", color: "purple" },
    ];

    const data = faker.helpers.arrayElement(sensibilities);

    return await prisma.sensibility.upsert({
      where: { label: data.label },
      update: {},
      create: {
        label: data.label,
        color: data.color,
      },
    });
  }
}
