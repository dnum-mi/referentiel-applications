import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ActorController } from './actor.controller';
import { ActorService } from './actor.service';
import { ActorRepository } from './infrastructure/repository/actor.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { MetadatasService } from 'src/metadatas/metadatas.service';
import { ApplicationQualityService } from 'src/product/quality.service';

@Module({
  imports: [PrismaModule],
  controllers: [ActorController],
  providers: [
    ActorService,
    ActorRepository,
    PrismaService,
    MetadatasService,
    ApplicationQualityService,
  ],
  exports: [ActorRepository],
})
export class ActorModule {}
