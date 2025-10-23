import { Module } from "@nestjs/common";
import { MetadataModule } from "src/metadata/metadata.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { LabelsController } from "./labels.controller";
import { LabelsService } from "./labels.service";

@Module({
  imports: [MetadataModule, PrismaModule],
  controllers: [LabelsController],
  providers: [LabelsService],
  exports: [LabelsService],
})
export class LabelsModule { }
