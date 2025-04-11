import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ApplicationSearchController } from './search.controller';
import { ApplicationSearchService } from './search.service';
import { ApplicationSearchRepository } from './infrastructure/search.repository';

@Module({
  imports: [PrismaModule],
  controllers: [ApplicationSearchController],
  providers: [
    ApplicationSearchService,
    {
      provide: 'IApplicationSearchRepository',
      useClass: ApplicationSearchRepository,
    },
  ],
})
export class ApplicationSearchModule {}
