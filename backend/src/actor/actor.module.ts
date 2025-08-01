import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import {
  ApplicationActorsController,
  ActorController,
} from './actor.controller';
import { ActorService } from './actor.service';
import { ActorRepository } from './infrastructure/repository/actor.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { ApplicationModule } from 'src/product/application.module';
import { MetadataModule } from 'src/metadata/metadata.module';

@Module({
  imports: [PrismaModule, ApplicationModule, MetadataModule],
  controllers: [ApplicationActorsController, ActorController],
  providers: [ActorService, ActorRepository, PrismaService],
  exports: [ActorRepository],
})
export class ActorModule { }
