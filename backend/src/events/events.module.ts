import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { MetadatasModule } from 'src/metadatas/metadatas.module';

@Module({
  imports: [MetadatasModule],
  controllers: [EventsController],
  providers: [EventsService, PrismaService],
  exports: [EventsService],
})
export class EventsModule {}
