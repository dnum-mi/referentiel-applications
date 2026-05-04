import { PrismaClient } from "@prisma/client";
import { fakerFR as faker } from "@faker-js/faker";

const prisma = new PrismaClient();

export class UpdateFrequencyFaker {
  static async create() {
    const frequencies = [
      "Annuelle",
      "Mensuelle",
      "Trimestriel",
      "Quotidienne",
      "Hebdomadaire",
      "Au besoin",
      "Jamais",
    ];

    const label = faker.helpers.arrayElement(frequencies);

    return await prisma.updateFrequency.upsert({
      where: { label: label },
      update: {},
      create: {
        label: label,
      },
    });
  }
}
