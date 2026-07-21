import { Global, Module } from "@nestjs/common";
import { CommonModule } from "src/common/common.module";
import { UnscopedAdminGuard } from "src/common/guards/unscoped-admin.guard";
import { PrismaModule } from "src/prisma/prisma.module";
import { FeatureFlagController } from "./feature-flag.controller";
import { FeatureFlagGuard } from "./feature-flag.guard";
import { FeatureFlagService } from "./feature-flag.service";

// Global : la garde `FeatureFlagGuard` et le service `isEnabled` doivent être
// injectables depuis n'importe quel contrôleur gaté sans réimporter le module.
@Global()
@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [FeatureFlagController],
  providers: [FeatureFlagService, FeatureFlagGuard, UnscopedAdminGuard],
  exports: [FeatureFlagService, FeatureFlagGuard],
})
export class FeatureFlagModule {}
