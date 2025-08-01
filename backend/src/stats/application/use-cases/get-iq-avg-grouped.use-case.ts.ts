import { Inject, Injectable } from "@nestjs/common";
import { StatsType } from "@prisma/client";
import { GroupBy } from "../../interfaces/types/stats-entry.type";
import { StatsAggregator } from "src/stats/infrastructure/helpers/stats.aggregator";
import { IStatsRepository } from "src/stats/infrastructure/stats.repository-interface";

@Injectable()
export class GetIqAvgGroupedUseCase {
  constructor(
    @Inject("IStatsRepository")
    private readonly statsRepository: IStatsRepository,
  ) {}

  async execute(from: Date, to: Date, groupBy: GroupBy) {
    const rawStats = await this.statsRepository.getStatsBetweenDates(
      from,
      to,
      StatsType.iqAvg,
    );
    const entries = rawStats.map(s => ({ date: s.date, valeur: s.valeur }));
    return StatsAggregator.groupByPeriod(entries, groupBy);
  }
}
