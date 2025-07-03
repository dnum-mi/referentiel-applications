import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ActorController, GlobalActorController } from './actor.controller';
import { ActorService } from './actor.service';
import { ActorRepository } from './infrastructure/repository/actor.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { MetadatasService } from 'src/metadatas/metadatas.service';
import { ApplicationModule } from 'src/product/application.module';

@Module({
  imports: [PrismaModule, ApplicationModule],
  controllers: [ActorController, GlobalActorController],
  providers: [ActorService, ActorRepository, PrismaService, MetadatasService],
  exports: [ActorRepository],
})
export class ActorModule {}
