import { Module } from "@nestjs/common";
import { CommonModule } from "src/common/common.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { TagsController } from "./tags.controller";
import { TagsService } from "./tags.service";
import { PrismaQueryBuilder } from "./prisma-query-builder.service";

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [TagsController],
  providers: [TagsService, PrismaQueryBuilder],
  exports: [TagsService],
})
export class TagsModule {}
