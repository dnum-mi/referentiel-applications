import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { HealthCheckController } from "./health-check.controller";
import { MaintenanceModule } from "src/maintenance/maintenance.module";

@Module({
  imports: [PrismaModule, MaintenanceModule],
  controllers: [HealthCheckController],
})
export class HealthCheckModule {}
