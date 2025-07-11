import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StatsType } from '@prisma/client';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  public async computeAndStoreMonthlyIqAvg() {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const existing = await this.prisma.stats.findFirst({
      where: { date: target, type: StatsType.iqAvg },
    });
    if (existing) {
      return existing;
    }

    const average = await this.calculateCurrentQualityAvg();

    return this.prisma.stats.create({
      data: {
        valeur: average,
        type: StatsType.iqAvg,
        date: target,
      },
    });
  }

  public async getLast6MonthsIqAvg() {
    const now = new Date();
    const months = Array.from(
      { length: 6 },
      (_, i) => new Date(now.getFullYear(), now.getMonth() - 6 + i + 1, 1),
    );

    const stats = await this.prisma.stats.findMany({
      where: { date: { gte: months[0] }, type: StatsType.iqAvg },
      orderBy: { date: 'asc' },
    });

    return months.map((m) => {
      const s = stats.find((st) => st.date.getTime() === m.getTime());
      return { date: m, valeur: s?.valeur ?? 0 };
    });
  }

  private async calculateCurrentQualityAvg(): Promise<number> {
    const { _avg } = await this.prisma.application.aggregate({
      _avg: { quality: true },
      where: { quality: { not: null } },
    });
    return _avg.quality ?? 0;
  }
}
