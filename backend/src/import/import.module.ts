import { Module } from "@nestjs/common";
import { ActorModule } from "src/actor/actor.module";
import { ApplicationModule } from "src/applications/application.module";
import { CommonModule } from "src/common/common.module";
import { CompliancesModule } from "src/compliances/compliances.module";
import { HostingsModule } from "src/hostings/hostings.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { UserModule } from "src/user/user.module";
import { ExcelImportService } from "./excel-import.service";
import { ImportController } from "./import.controller";
import { ActorsSheetProcessor } from "./processors/actors-sheet.processor";
import { ApplicationsSheetProcessor } from "./processors/applications-sheet.processor";
import { CompliancesSheetProcessor } from "./processors/compliances-sheet.processor";
import { HostingsSheetProcessor } from "./processors/hostings-sheet.processor";

@Module({
  imports: [
    PrismaModule,
    ActorModule,
    ApplicationModule,
    HostingsModule,
    UserModule,
    CommonModule,
    CompliancesModule,
  ],
  controllers: [ImportController],
  providers: [
    ExcelImportService,
    ApplicationsSheetProcessor,
    HostingsSheetProcessor,
    ActorsSheetProcessor,
    CompliancesSheetProcessor,
  ],
})
export class ImportModule {}
