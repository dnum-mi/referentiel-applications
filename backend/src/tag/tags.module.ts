import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { TagsController } from "./tags.controller";
import { TagsService } from "./tags.service";
import { PrismaQueryBuilder } from "./prisma-query-builder.service";

@Module({
  imports: [PrismaModule],
  controllers: [TagsController],
  providers: [TagsService, PrismaQueryBuilder],
  exports: [TagsService],
})
export class TagsModule {}
