import { Module } from "@nestjs/common";
import { ConfigService } from "./config.service";
import { ConfigController } from "./config.controller";

@Module({
  exports: [ConfigService],
  controllers: [ConfigController],
  providers: [ConfigService],
})
export class ConfigModule { }
