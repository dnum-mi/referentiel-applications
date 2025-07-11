import { Controller, Get, Post } from '@nestjs/common';
import { StatsService } from './stats.service';

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Post()
  async createStat() {
    return this.statsService.computeAndStoreMonthlyIqAvg();
  }

  @Get()
  async getLast6Months() {
    return this.statsService.getLast6MonthsIqAvg();
  }
}
