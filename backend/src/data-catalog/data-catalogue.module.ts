import { Module } from "@nestjs/common";
import { DataCatalogService } from "./data-catalog.service";
import { MetadatasModule } from "../metadatas/metadatas.module";
import { CommonModule } from "../common/common.module";
import { DataCatalogController } from "./data-catalog.controller";
import { IDataCatalogRepositoryToken } from "./infrastructure/data-catalog.repository.interface";
import { DataCatalogPrismaRepository } from "./infrastructure/data-catalog.repository";

@Module({
  imports: [MetadatasModule, CommonModule],
  controllers: [DataCatalogController],
  providers: [
    DataCatalogService,
    {
      provide: IDataCatalogRepositoryToken,
      useClass: DataCatalogPrismaRepository,
    },
  ],
  exports: [DataCatalogService],
})
export class DataCatalogModule {}
