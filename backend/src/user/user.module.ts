import { Module } from "@nestjs/common";
import { CommonModule } from "src/common/common.module";
import { LoggerService } from "src/logger/logger.service";
import { OrganizationMaiaReferencesModule } from "src/organization-maia-references/organization-maia-references.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";
import { UserPermissionLogService } from "./user-permission-log.service";
import { UserConnexionLogService } from "./user-connexion-log.service";
import { ScopedPermissionService } from "./scope-permission/scoped-permission.service";

@Module({
  imports: [PrismaModule, CommonModule, OrganizationMaiaReferencesModule],
  controllers: [UserController],
  providers: [
    UserService,
    LoggerService,
    UserPermissionLogService,
    UserConnexionLogService,
    ScopedPermissionService,
  ],
  exports: [UserService, UserConnexionLogService],
})
export class UserModule {}
