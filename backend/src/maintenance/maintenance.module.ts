import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { MaintenanceMiddleware } from "./maintenance.middleware";
import { MaintenanceService } from "./maintenance.service";

@Module({
  imports: [PrismaModule],
  providers: [MaintenanceService, MaintenanceMiddleware],
  exports: [MaintenanceService, MaintenanceMiddleware],
})
export class MaintenanceModule {}
