import { Module } from "@nestjs/common";
import { CommonModule } from "src/common/common.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { RgaaController } from "./rgaa.controller";
import { RgaaService } from "./rgaa.service";
import { MetadatasModule } from "src/metadatas/metadatas.module";
import { ApplicationModule } from "src/applications/application.module";

@Module({
  imports: [MetadatasModule, PrismaModule, CommonModule, ApplicationModule],
  controllers: [RgaaController],
  providers: [RgaaService],
  exports: [RgaaService],
})
export class RgaaModule {}
