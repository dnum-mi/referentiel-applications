import { Inject, Injectable, Logger } from "@nestjs/common";
import { StatsType } from "@prisma/client";
import { GroupBy } from "../interfaces/types/stats-entry.type";
import { StatsHelper } from "../infrastructure/helpers/stats.helper";
import { GetIqAvgGroupedUseCase } from "./use-cases/get-iq-avg-grouped.use-case.ts";
import { IStatsRepository } from "../infrastructure/stats.repository-interface";

@Injectable()
export class StatsService {
  constructor(
    @Inject("IStatsRepository")
    private readonly statsRepository: IStatsRepository,
    private readonly getIqAvgGroupedUseCase: GetIqAvgGroupedUseCase,
  ) {}

  async getIqAvgGrouped(from?: Date, to?: Date, groupBy: GroupBy = "month") {
    const today = new Date();
    const defaultTo = today;
    const defaultFrom = new Date(today.getFullYear(), today.getMonth() - 5, 1);

    const fromDate = from ?? defaultFrom;
    const toDate = to ?? defaultTo;

    return this.getIqAvgGroupedUseCase.execute(fromDate, toDate, groupBy);
  }

  async computeAndStoreDailyIqAvg(): Promise<{ date: Date, valeur: number }> {
    const now = new Date();
    const date = StatsHelper.getUtcMidnightForParis(now);
    Logger.log(
      `🕒 computeAndStoreDailyIqAvg démarré pour date=${date.toISOString()}`,
    );

    // 1) Vérifier si la stat du jour existe déjà
    const existing = await this.statsRepository.getStatsBetweenDates(
      date,
      date,
      StatsType.iqAvg,
    );
    Logger.log(
      `🔍 Vérification de l'existence de la stat du jour: ${existing.length} entrées trouvées.`,
    );
    if (existing.length > 0) {
      Logger.log("⚠️ Stat du jour déjà existante, pas de calcul nécessaire.");
      return existing[0];
    }

    // 2) Calculer la moyenne de 'quality' via la méthode du repository
    const moyenneQuality
      = await this.statsRepository.getAverageApplicationQuality();
    Logger.log(`➗ Quality moyenne calculée = ${moyenneQuality}`);

    // 3) Enregistrer la stat via la méthode du repository
    const created = await this.statsRepository.createStat(
      StatsType.iqAvg,
      date,
      moyenneQuality,
    );
    Logger.log(`✅ Stat insérée id=${created.id}, valeur=${created.valeur}`);

    return { date: created.date, valeur: created.valeur };
  }
}
