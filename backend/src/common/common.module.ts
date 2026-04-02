import { Module } from "@nestjs/common";
import { ExcelBuilderService } from "./service/excel-builder.service";
import { CheckPermissions } from "./service/check-permissions.service";

@Module({
  providers: [ExcelBuilderService, CheckPermissions],
  exports: [ExcelBuilderService, CheckPermissions],
})
export class CommonModule {}
