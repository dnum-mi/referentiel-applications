import { Module } from "@nestjs/common";
import { CommonModule } from "src/common/common.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { GristClient } from "./grist.client";
import { GristController } from "./grist.controller";
import { GristService } from "./grist.service";

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [GristController],
  providers: [GristClient, GristService],
})
export class GristModule {}
