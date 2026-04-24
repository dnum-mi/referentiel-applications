import { Module } from "@nestjs/common";
import { CommonModule } from "src/common/common.module";
import { MetadatasModule } from "src/metadatas/metadatas.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { DataSourceController } from "./data-source.controller";
import { DataSourceService } from "./data-source.service";

@Module({
  imports: [MetadatasModule, PrismaModule, CommonModule],
  controllers: [DataSourceController],
  providers: [DataSourceService],
  exports: [DataSourceService],
})
export class DataSourceModule {}
