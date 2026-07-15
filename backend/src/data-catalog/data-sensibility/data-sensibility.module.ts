import { Module } from "@nestjs/common";
import { CommonModule } from "src/common/common.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { DataSensibilityController } from "./data-sensibility.controller";
import { DataSensibilityService } from "./data-sensibility.service";

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [DataSensibilityController],
  providers: [DataSensibilityService],
  exports: [DataSensibilityService],
})
export class DataSensibilityModule {}
