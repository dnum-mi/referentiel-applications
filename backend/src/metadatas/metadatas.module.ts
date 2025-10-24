import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { MetadataRepository } from "./infrastructure/metadata.repository";
import { ApplicationMetadatasController, MetadatasController } from "./metadatas.controller";
import { MetadatasService } from "./metadatas.service";

@Module({
  imports: [PrismaModule],
  controllers: [ApplicationMetadatasController, MetadatasController],
  providers: [MetadatasService, MetadataRepository],
  exports: [MetadatasService, MetadataRepository],
})
export class MetadatasModule { }
