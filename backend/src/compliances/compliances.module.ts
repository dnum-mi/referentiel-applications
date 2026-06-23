import { Module } from "@nestjs/common";
import { CommonModule } from "src/common/common.module";
import { MetadatasModule } from "src/metadatas/metadatas.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { ApplicationModule } from "src/applications/application.module";
import {
  ApplicationCompliancesController,
  ComplianceController,
} from "./compliances.controller";
import { CompliancesService } from "./compliances.service";

@Module({
  imports: [MetadatasModule, ApplicationModule, PrismaModule, CommonModule],
  controllers: [ApplicationCompliancesController, ComplianceController],
  providers: [CompliancesService],
  exports: [CompliancesService],
})
export class CompliancesModule {}
