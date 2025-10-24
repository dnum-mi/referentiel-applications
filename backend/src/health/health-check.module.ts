import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { HealthCheckController } from "./health-check.controller";

@Module({
  imports: [PrismaModule],
  controllers: [HealthCheckController],
})
export class HealthCheckModule {}
