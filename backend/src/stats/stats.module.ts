import { Module } from '@nestjs/common';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';
import { StatsCronService } from './stats.cron';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [StatsService, StatsCronService],
  controllers: [StatsController],
})
export class StatsModule {}
