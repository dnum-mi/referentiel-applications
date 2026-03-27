import { Module } from "@nestjs/common";
import { CommonModule } from "src/common/common.module";
import { MetadatasModule } from "src/metadatas/metadatas.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { ApplicationModule } from "src/applications/application.module";
import { ApplicationLinksController } from "./links.controller";
import { LinksService } from "./links.service";

@Module({
  imports: [ApplicationModule, MetadatasModule, PrismaModule, CommonModule],
  controllers: [ApplicationLinksController],
  providers: [LinksService],
})
export class LinksModule {}
