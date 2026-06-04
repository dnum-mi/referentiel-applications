import { Module } from "@nestjs/common";
import { ExcelBuilderService } from "./service/excel-builder.service";
import { CheckPermissions } from "./service/check-permissions.service";
import { QueryBuilderGroupActor } from "./service/prisma-query-builder.service";
import { PrismaQueryBuilder } from "src/applications/prisma-query-builder.service";

@Module({
  providers: [
    ExcelBuilderService,
    CheckPermissions,
    QueryBuilderGroupActor,
    PrismaQueryBuilder,
  ],
  exports: [
    ExcelBuilderService,
    CheckPermissions,
    QueryBuilderGroupActor,
    PrismaQueryBuilder,
  ],
})
export class CommonModule {}
