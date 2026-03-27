import { Module } from "@nestjs/common";
import { CommonModule } from "src/common/common.module";
import { EmailModule } from "src/email/email.module";
import { MetadatasModule } from "src/metadatas/metadatas.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { ApplicationModule } from "src/applications/application.module";
import {
  ActorController,
  ApplicationActorsController,
} from "./actor.controller";
import { ActorService } from "./actor.service";

@Module({
  imports: [
    PrismaModule,
    ApplicationModule,
    MetadatasModule,
    EmailModule,
    CommonModule,
  ],
  controllers: [ApplicationActorsController, ActorController],
  providers: [ActorService],
  exports: [ActorService],
})
export class ActorModule {}
