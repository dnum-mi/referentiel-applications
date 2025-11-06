import { Module } from "@nestjs/common";
import { EmailModule } from "src/email/email.module";
import { MetadatasModule } from "src/metadatas/metadatas.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { ApplicationModule } from "src/product/application.module";
import {
  ActorController,
  ApplicationActorsController,
} from "./actor.controller";
import { ActorService } from "./actor.service";
import { ActorRepository } from "./infrastructure/repository/actor.repository";

@Module({
  imports: [PrismaModule, ApplicationModule, MetadatasModule, EmailModule],
  controllers: [ApplicationActorsController, ActorController],
  providers: [ActorService, ActorRepository],
  exports: [ActorRepository],
})
export class ActorModule { }
