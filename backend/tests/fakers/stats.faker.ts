import { StatsType } from "@prisma/client";
import { faker } from "@faker-js/faker";
import { getPrismaClient } from "./prisma";

export class StatsFaker {
  static async create(override?: {
    date?: Date;
    value?: number;
    type?: StatsType;
  }) {
    const prisma = getPrismaClient();
    const date = override?.date ?? new Date();
    const value = override?.value ?? faker.number.int({ min: 45, max: 90 });
    const type = override?.type ?? StatsType.iqAvg;

    return await prisma.stats.upsert({
      where: {
        date_type: {
          date,
          type,
        },
      },
      create: {
        type,
        date,
        valeur: value,
      },
      update: { valeur: value },
    });
  }
}
