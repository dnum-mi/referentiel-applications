import { Module } from "@nestjs/common";
import { CommonModule } from "src/common/common.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { FeatureFlagController } from "./feature-flag.controller";
import { FeatureFlagGuard } from "./feature-flag.guard";
import { FeatureFlagService } from "./feature-flag.service";

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [FeatureFlagController],
  providers: [FeatureFlagService, FeatureFlagGuard],
  exports: [FeatureFlagService, FeatureFlagGuard],
})
export class FeatureFlagModule {}
