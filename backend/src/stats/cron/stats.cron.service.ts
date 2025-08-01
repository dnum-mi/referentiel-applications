import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { StatsService } from "../application/stats.service";

@Injectable()
export class StatsCronService {
  private readonly logger = new Logger(StatsCronService.name);

  constructor(private readonly statsService: StatsService) {}

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
