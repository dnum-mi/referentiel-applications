import { PrismaClient } from "@prisma/client";
import { fakerFR as faker } from "@faker-js/faker";

const prisma = new PrismaClient();

export class DataSourceTypeFaker {
  static async create() {
    const dataSourceTypes = [
      { label: "API REST" },
      { label: "Base de données SQL" },
      { label: "Fichier plat CSV" },
      { label: "Flux Kafka" },
    ];

    const data = faker.helpers.arrayElement(dataSourceTypes);

    return await prisma.dataSourceType.upsert({
      where: { label: data.label },
      update: {},
      create: {
        label: data.label,
      },
    });
  }
}
