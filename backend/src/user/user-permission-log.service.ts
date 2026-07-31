import { Injectable } from "@nestjs/common";
import { User, UserPermissionLog } from "@prisma/client";
import { BaseService } from "src/common/base.service";
import { PrismaService } from "src/prisma/prisma.service";
import { Requestor } from "./entities/user.entity";
import { UserPermissionLogDto } from "./dto/user-permission-log.dto";

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

  public async findAllForUser(userId: string): Promise<UserPermissionLogDto[]> {
    const logs: UserPermissionLog[] = await this.model.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    const changedByIds = [
      ...new Set(
        logs
          .map((log) => log.changedById)
          .filter((id): id is string => id !== null),
      ),
    ];

    const changedByUsers = changedByIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: changedByIds } },
          select: { id: true, email: true },
        })
      : [];
    const emailById = new Map(
      changedByUsers.map((user) => [user.id, user.email]),
    );

    return logs.map((log) => ({
      id: log.id,
      createdAt: log.createdAt,
      role: log.role,
      additionalPermissions: log.additionalPermissions,
      changedByEmail: log.changedById
        ? (emailById.get(log.changedById) ?? null)
        : null,
    }));
  }
}
