import { Module } from "@nestjs/common";
import { MetadatasModule } from "src/metadatas/metadatas.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { ApplicationModule } from "src/product/application.module";
import { ApplicationTechnicalDebtInfoController } from "./technical-debt-info.controller";
import { TechnicalDebtController } from "./technical-debt.controller";
import { TechnicalDebtInfoService } from "./technical-debt-info.service";

@Module({
  imports: [MetadatasModule, ApplicationModule, PrismaModule],
  controllers: [
    ApplicationTechnicalDebtInfoController,
    TechnicalDebtController,
  ],
  providers: [TechnicalDebtInfoService],
})
export class TechnicalDebtInfoModule {}
