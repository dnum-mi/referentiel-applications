import { Module } from "@nestjs/common";
import { HealthCheckController } from "./controllers/health-check.controller";
import { PrismaModule } from "src/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [HealthCheckController],
})
export class HealthCheckModule {}
