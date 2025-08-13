import { Module } from "@nestjs/common";
import { CompliancesService } from "./compliances.service";
import { PrismaModule } from "src/prisma/prisma.module";
import {
  ApplicationCompliancesController,
  ComplianceController,
} from "./compliances.controller";
import { MetadataModule } from "src/metadata/metadata.module";
import { ApplicationModule } from "src/product/application.module";

@Module({
  imports: [MetadataModule, ApplicationModule, PrismaModule],
  controllers: [ApplicationCompliancesController, ComplianceController],
  providers: [CompliancesService],
})
export class CompliancesModule { }
