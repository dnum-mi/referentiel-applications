import { Module } from "@nestjs/common";
import { CommonModule } from "src/common/common.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { LicenseController } from "./license.controller";
import { LicenseService } from "./license.service";
import { MetadatasModule } from "src/metadatas/metadatas.module";
import { ApplicationModule } from "src/applications/application.module";

@Module({
  imports: [MetadatasModule, PrismaModule, CommonModule, ApplicationModule],
  controllers: [LicenseController],
  providers: [LicenseService],
  exports: [LicenseService],
})
export class LicenseModule {}
