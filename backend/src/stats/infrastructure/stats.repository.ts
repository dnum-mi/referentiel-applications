import { Injectable } from "@nestjs/common";
import { StatsType } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { IStatsRepository } from "./stats.repository-interface";

@Injectable()
export class StatsRepository implements IStatsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Récupère les stats entre deux dates pour un type donné */
  async getStatsBetweenDates(
    from: Date,
    to: Date,
    type: StatsType,
  ): Promise<{ date: Date, valeur: number }[]> {
    return this.prisma.stats.findMany({
      where: {
        type,
        date: { gte: from, lte: to },
      },
      orderBy: { date: "asc" },
      select: { date: true, valeur: true },
    });
  }

  async getAverageApplicationQuality(): Promise<number> {
    // Récupère toutes les valeurs (certaines peuvent être null)
    const records = await this.prisma.application.findMany({
      select: { quality: true },
    });

    // Filtrer les valeurs non-null
    const valid = records
      .map(r => r.quality)
      .filter((q): q is number => q !== null && q !== undefined);

    if (valid.length === 0) {
      return 0;
    }

    const sum = valid.reduce((acc, q) => acc + q, 0);
    return Number((sum / valid.length).toFixed(2));
  }

  /** Insère une stat */
  async createStat(type: StatsType, date: Date, valeur: number) {
    return this.prisma.stats.create({
      data: { type, date, valeur },
    });
  }
}
