import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { ActorTypeController } from "./actorType.controller";
import { ActorTypeService } from "./actorType.service";

@Module({
  imports: [PrismaModule],
  controllers: [ActorTypeController],
  providers: [ActorTypeService],
  exports: [ActorTypeService],
})
export class ActorTypeModule {}
