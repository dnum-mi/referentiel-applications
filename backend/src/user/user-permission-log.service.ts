import { Injectable } from "@nestjs/common";
import { User, UserPermissionLog } from "@prisma/client";
import { BaseService } from "src/common/base.service";
import { requestContext } from "src/common/request-context";
import { PrismaService } from "src/prisma/prisma.service";
import { Requestor } from "./entities/user.entity";
import { UserPermissionLogDto } from "./dto/user-permission-log.dto";

@Injectable()
export class UserPermissionLogService extends BaseService<UserPermissionLog> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma.userPermissionLog, prisma);
  }

  public async log(user: User, requestor?: Requestor) {
    // `user.update` n'est pas couvert par l'extension Prisma d'impersonation (trop large :
    // elle toucherait toute mise à jour de User, y compris hors contexte de permissions) —
    // on lit donc directement le contexte de requête ici, comme le fait l'extension elle-même.
    const impersonatorId = requestContext.getStore()?.impersonatorId ?? null;
    const [log] = await this.prisma.$transaction([
      this.model.create({
        data: {
          userId: user.id,
          changedById: requestor?.id ?? null,
          role: user.role,
          additionalPermissions: user.additionalPermissions ?? [],
        },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          lastPermissionChangeAt: new Date(),
          lastPermissionChangedById: requestor?.id ?? null,
          lastPermissionChangedByImpersonatorId: impersonatorId,
        },
      }),
    ]);
    return log;
  }

  public async findAllForUser(userId: string): Promise<UserPermissionLogDto[]> {
    const logs: UserPermissionLog[] = await this.model.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    const referencedIds = [
      ...new Set(
        logs
          .flatMap((log) => [log.changedById, log.impersonatorId])
          .filter((id): id is string => id !== null),
      ),
    ];

    const referencedUsers = referencedIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: referencedIds } },
          select: { id: true, email: true },
        })
      : [];
    const emailById = new Map(
      referencedUsers.map((user) => [user.id, user.email]),
    );

    return logs.map((log) => ({
      id: log.id,
      createdAt: log.createdAt,
      role: log.role,
      additionalPermissions: log.additionalPermissions,
      changedByEmail: log.changedById
        ? (emailById.get(log.changedById) ?? null)
        : null,
      // Administrateur réel si la modification a été faite sous impersonation (#2061).
      impersonatorEmail: log.impersonatorId
        ? (emailById.get(log.impersonatorId) ?? null)
        : null,
    }));
  }
}
