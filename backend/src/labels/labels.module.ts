import { Module } from "@nestjs/common";
import { CommonModule } from "src/common/common.module";
import { MetadatasModule } from "src/metadatas/metadatas.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { LabelsController } from "./labels.controller";
import { LabelsService } from "./labels.service";

@Module({
  imports: [MetadatasModule, PrismaModule, CommonModule],
  controllers: [LabelsController],
  providers: [LabelsService],
  exports: [LabelsService],
})
export class LabelsModule {}
