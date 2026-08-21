import { Module } from "@nestjs/common";
import { CommonModule } from "src/common/common.module";
import { NotificationModule } from "src/notification/notification.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { MetadataRepository } from "./infrastructure/metadata.repository";
import {
  ApplicationMetadatasController,
  MetadatasController,
} from "./metadatas.controller";
import { MetadatasService } from "./metadatas.service";

@Module({
  imports: [PrismaModule, CommonModule, NotificationModule],
  controllers: [ApplicationMetadatasController, MetadatasController],
  providers: [MetadatasService, MetadataRepository],
  exports: [MetadatasService, MetadataRepository],
})
export class MetadatasModule {}
