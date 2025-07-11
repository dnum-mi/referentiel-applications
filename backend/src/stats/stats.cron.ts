import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { StatsService } from './stats.service';

@Injectable()
export class StatsCronService {
  private readonly logger = new Logger(StatsCronService.name);

  constructor(private readonly statsService: StatsService) {}

  @Cron('0 0 1 * *', { timeZone: 'Europe/Paris' })
  async handleMonthlyJob() {
    await this.statsService.computeAndStoreMonthlyIqAvg();
  }
}
