import { Module } from "@nestjs/common";
import { LabelsService } from "./labels.service";
import { LabelsController } from "./labels.controller";
import { PrismaModule } from "src/prisma/prisma.module";
import { MetadataModule } from "src/metadata/metadata.module";

@Module({
  imports: [MetadataModule, PrismaModule],
  controllers: [LabelsController],
  providers: [LabelsService],
  exports: [LabelsService],
})
export class LabelsModule { }
