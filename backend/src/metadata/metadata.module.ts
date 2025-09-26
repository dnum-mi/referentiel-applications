import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { MetadataService } from "./metadata.service";
import { MetadataRepository } from "./infrastructure/metadata.repository";
import { MetadatasController, ApplicationMetadataController } from "./metadata.controller";

@Module({
  imports: [PrismaModule],
  controllers: [ApplicationMetadataController, MetadatasController],
  providers: [MetadataService, MetadataRepository],
  exports: [MetadataService, MetadataRepository],
})
export class MetadataModule { }
