import { Injectable } from "@nestjs/common";
import { User, UserPermissionLog } from "@prisma/client";
import { BaseService } from "src/common/base.service";
import { PrismaService } from "src/prisma/prisma.service";
import { Requestor } from "./entities/user.entity";

@Injectable()
export class UserPermissionLogService extends BaseService<UserPermissionLog> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma.userPermissionLog, prisma);
  }

  public log(user: User, requestor?: Requestor) {
    return this.create({
      userId: user.id,
      changedById: requestor?.id ?? null,
      role: user.role,
      additionalPermissions: user.additionalPermissions ?? [],
    });
  }
}
