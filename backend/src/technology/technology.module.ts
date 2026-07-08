import { Module } from "@nestjs/common";
import { CommonModule } from "src/common/common.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { TechnologyController } from "./technology.controller";
import { TechnologyService } from "./technology.service";
import { MetadatasModule } from "src/metadatas/metadatas.module";
import { ApplicationModule } from "src/applications/application.module";

@Module({
  imports: [MetadatasModule, PrismaModule, CommonModule, ApplicationModule],
  controllers: [TechnologyController],
  providers: [TechnologyService],
  exports: [TechnologyService],
})
export class TechnologyModule {}
