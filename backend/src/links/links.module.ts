import { Module } from "@nestjs/common";
import { LinksService } from "./links.service";
import { PrismaModule } from "src/prisma/prisma.module";
import { ApplicationLinksController } from "./links.controller";
import { ApplicationModule } from "src/product/application.module";
import { MetadataModule } from "src/metadata/metadata.module";

@Module({
  imports: [ApplicationModule, MetadataModule, PrismaModule],
  controllers: [ApplicationLinksController],
  providers: [LinksService],
})
export class LinksModule { }
