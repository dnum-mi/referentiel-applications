import type { Stats, StatsType } from "@prisma/client";

export interface IStatsRepository {
  getStatsBetweenDates: (
    from: Date,
    to: Date,
    type: StatsType,
  ) => Promise<{ date: Date; valeur: number }[]>;
  getAverageApplicationQuality: () => Promise<number>;
  createStat: (type: StatsType, date: Date, valeur: number) => Promise<Stats>;
}
