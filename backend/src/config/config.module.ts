import { Module } from "@nestjs/common";
import { FeatureFlagModule } from "src/feature-flag/feature-flag.module";
import { ConfigController } from "./config.controller";
import { ConfigService } from "./config.service";

@Module({
  imports: [FeatureFlagModule],
  exports: [ConfigService],
  controllers: [ConfigController],
  providers: [ConfigService],
})
export class ConfigModule {}
