import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { StatsService } from "./application/stats.service";
import { GetIqAvgGroupedUseCase } from "./application/use-cases/get-iq-avg-grouped.use-case.ts";

import { StatsCronService } from "./cron/stats.cron.service";
import { StatsRepository } from "./infrastructure/stats.repository";
import { StatsController } from "./interfaces/stats.controller";

@Module({
  imports: [PrismaModule],
  providers: [
    StatsService,
    StatsCronService,
    {
      provide: "IStatsRepository",
      useClass: StatsRepository,
    },
    StatsRepository,
    GetIqAvgGroupedUseCase,
  ],
  controllers: [StatsController],
})
export class StatsModule {}
