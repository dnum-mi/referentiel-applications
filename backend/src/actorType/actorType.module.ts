import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { ActorTypeController } from "./actorType.controller";
import { ActorTypeService } from "./actorType.service";
import { ActorTypeRepository } from "./infrastructure/repository/actorType.repository";

@Module({
  imports: [PrismaModule],
  controllers: [ActorTypeController],
  providers: [ActorTypeService, ActorTypeRepository],
  exports: [ActorTypeRepository],
})
export class ActorTypeModule {}
