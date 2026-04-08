import { Module } from "@nestjs/common";
import { CommonModule } from "src/common/common.module";
import { LoggerService } from "src/logger/logger.service";
import { PrismaModule } from "src/prisma/prisma.module";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";
import { UserPermissionLogService } from "./user-permission-log.service";
import { UserConnexionLogService } from "./user-connexion-log.service";

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [UserController],
  providers: [
    UserService,
    LoggerService,
    UserPermissionLogService,
    UserConnexionLogService,
  ],
  exports: [UserService, UserConnexionLogService],
})
export class UserModule {}
