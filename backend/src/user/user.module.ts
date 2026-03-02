import { Module } from "@nestjs/common";
import { LoggerService } from "src/logger/logger.service";
import { PrismaModule } from "src/prisma/prisma.module";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";
import { UserCapabilityService } from "./capabilities/user-capability.service";

@Module({
  imports: [PrismaModule],
  controllers: [UserController],
  providers: [UserService, LoggerService, UserCapabilityService],
  exports: [UserService, UserCapabilityService],
})
export class UserModule {}
