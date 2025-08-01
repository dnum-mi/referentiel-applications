import { Module } from "@nestjs/common";
import { ExcelBuilderService } from "./service/excel-builder.service";

@Module({
  providers: [ExcelBuilderService],
  exports: [ExcelBuilderService],
})
export class CommonModule {}
