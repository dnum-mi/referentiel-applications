import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { MetadataRepository } from "./infrastructure/metadata.repository";
import { ApplicationMetadataController, MetadatasController } from "./metadata.controller";
import { MetadataService } from "./metadata.service";

@Module({
  imports: [PrismaModule],
  controllers: [ApplicationMetadataController, MetadatasController],
  providers: [MetadataService, MetadataRepository],
  exports: [MetadataService, MetadataRepository],
})
export class MetadataModule { }
