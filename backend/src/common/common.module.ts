import { Module } from "@nestjs/common";
import { ExcelBuilderService } from "./service/excel-builder.service";
import { CheckPermissions } from "./service/check-permissions.service";
import { ContactAdminService } from "./service/contact-admin.service";
import { QueryBuilderGroupActor } from "./service/prisma-query-builder.service";
import { PrismaQueryBuilder } from "src/applications/prisma-query-builder.service";

@Module({
  providers: [
    ExcelBuilderService,
    CheckPermissions,
    ContactAdminService,
    QueryBuilderGroupActor,
    PrismaQueryBuilder,
  ],
  exports: [
    ExcelBuilderService,
    CheckPermissions,
    ContactAdminService,
    QueryBuilderGroupActor,
    PrismaQueryBuilder,
  ],
})
export class CommonModule {}
