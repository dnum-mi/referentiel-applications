import { PrismaClient } from "@prisma/client";
import { fakerFR as faker } from "@faker-js/faker";

const prisma = new PrismaClient();

export class UpdateFrequencyFaker {
  static async create() {
    const frequencies = [
      "Temps réel",
      "Quotidien",
      "Hebdomadaire",
      "Mensuel",
      "Trimestriel",
      "Annuel",
      "À la demande",
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
