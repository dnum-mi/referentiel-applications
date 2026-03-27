import { Module } from "@nestjs/common";
import { CommonModule } from "src/common/common.module";
import { PrismaModule } from "../prisma/prisma.module";
import { LabelSourceController } from "./label-source.controller";
import { LabelSourceService } from "./label-source.service";

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [LabelSourceController],
  providers: [LabelSourceService],
  exports: [LabelSourceService],
})
export class LabelSourceModule {}
