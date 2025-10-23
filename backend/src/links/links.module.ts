import { Module } from "@nestjs/common";
import { MetadataModule } from "src/metadata/metadata.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { ApplicationModule } from "src/product/application.module";
import { ApplicationLinksController } from "./links.controller";
import { LinksService } from "./links.service";

@Module({
  imports: [ApplicationModule, MetadataModule, PrismaModule],
  controllers: [ApplicationLinksController],
  providers: [LinksService],
})
export class LinksModule { }
