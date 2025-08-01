import { Module } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { MetadataService } from "./metadata.service";
import { MetadataRepository } from "./infrastructure/metadata.repository";
import { ApplicationMetadataController } from "./metadata.controller";

@Module({
  controllers: [ApplicationMetadataController],
  providers: [MetadataService, PrismaService, MetadataRepository],
  exports: [MetadataService, MetadataRepository],
})
export class MetadataModule { }
