import { Module } from "@nestjs/common";
import { BetaFeatureGuard } from "./guards/beta-feature.guard";
import { ExcelBuilderService } from "./service/excel-builder.service";
import { CheckPermissions } from "./service/check-permissions.service";
import { ContactAdminService } from "./service/contact-admin.service";
import { QueryBuilderGroupActor } from "./service/prisma-query-builder.service";
import { PrismaQueryBuilder } from "src/applications/prisma-query-builder.service";

@Module({
  providers: [
    BetaFeatureGuard,
    ExcelBuilderService,
    CheckPermissions,
    ContactAdminService,
    QueryBuilderGroupActor,
    PrismaQueryBuilder,
  ],
  exports: [
    BetaFeatureGuard,
    ExcelBuilderService,
    CheckPermissions,
    ContactAdminService,
    QueryBuilderGroupActor,
    PrismaQueryBuilder,
  ],
})
export class CommonModule {}
