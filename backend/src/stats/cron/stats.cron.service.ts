import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { StatsService } from "../application/stats.service";
import { LoggerService } from "src/logger/logger.service";

@Injectable()
export class StatsCronService {
  constructor(
    private readonly statsService: StatsService,
    private readonly logger: LoggerService,
  ) {}

  @Cron("0 0 * * *", { timeZone: "Europe/Paris" })
  async handleDailyIqAvgJob() {
    this.logger.log("Starting daily IQ average computation");
    try {
      await this.statsService.computeAndStoreDailyIqAvg();
      this.logger.log("Daily IQ average computation completed successfully");
    } catch (error) {
      this.logger.error("Error during daily IQ average computation", error);
    }
  }
}
