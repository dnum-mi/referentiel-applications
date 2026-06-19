import { Module } from "@nestjs/common";
import { ActorModule } from "src/actor/actor.module";
import { CommonModule } from "src/common/common.module";
import { CompliancesModule } from "src/compliances/compliances.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { ExcelImportService } from "./excel-import.service";
import { ImportController } from "./import.controller";
import { ActorsSheetProcessor } from "./processors/actors-sheet.processor";
import { CompliancesSheetProcessor } from "./processors/compliances-sheet.processor";

@Module({
  imports: [PrismaModule, ActorModule, CommonModule, CompliancesModule],
  controllers: [ImportController],
  providers: [
    ExcelImportService,
    ActorsSheetProcessor,
    CompliancesSheetProcessor,
  ],
})
export class ImportModule {}
