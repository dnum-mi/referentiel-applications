import { Module } from "@nestjs/common";
import { MetadataModule } from "src/metadata/metadata.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { ApplicationModule } from "src/product/application.module";
import {
  ApplicationCompliancesController,
  ComplianceController,
} from "./compliances.controller";
import { CompliancesService } from "./compliances.service";

@Module({
  imports: [MetadataModule, ApplicationModule, PrismaModule],
  controllers: [ApplicationCompliancesController, ComplianceController],
  providers: [CompliancesService],
})
export class CompliancesModule { }
