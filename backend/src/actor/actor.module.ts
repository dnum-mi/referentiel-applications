import { Module } from "@nestjs/common";
import { MetadataModule } from "src/metadata/metadata.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { ApplicationModule } from "src/product/application.module";
import {
  ActorController,
  ApplicationActorsController,
} from "./actor.controller";
import { ActorService } from "./actor.service";
import { ActorRepository } from "./infrastructure/repository/actor.repository";

@Module({
  imports: [PrismaModule, ApplicationModule, MetadataModule],
  controllers: [ApplicationActorsController, ActorController],
  providers: [ActorService, ActorRepository],
  exports: [ActorRepository],
})
export class ActorModule { }
