import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { NotificationType, Permission, Roles } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationFiltersDto } from "./dto/notification-filters.dto";

// ReportManage est accordé globalement dès CONTRIBUTOR (cf. WRITE_PERMISSIONS,
// backend/src/permissions/role-to-permissions.ts) : ces rôles n'ont pas besoin d'être
// acteur de l'application pour gérer ses signalements.
const REPORT_MANAGE_ROLES: Roles[] = [Roles.CONTRIBUTOR, Roles.ADMIN];

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    type: NotificationType,
    message: string,
    options?: { link?: string; applicationId?: string; emailLogId?: string },
  ) {
    return this.createForUsers([userId], type, message, options);
  }

  async createForUsers(
    userIds: string[],
    type: NotificationType,
    message: string,
    options?: { link?: string; applicationId?: string; emailLogId?: string },
  ) {
    const uniqueUserIds = [...new Set(userIds)];
    if (uniqueUserIds.length === 0) {
      return;
    }
    try {
      await this.prisma.notification.createMany({
        data: uniqueUserIds.map((userId) => ({
          userId,
          type,
          message,
          link: options?.link,
          applicationId: options?.applicationId,
          emailLogId: options?.emailLogId,
        })),
      });
    } catch (error) {
      // La notification in-app est un complément à l'email : son échec ne doit jamais
      // faire échouer l'action métier qui la déclenche.
      Logger.error(
        `Échec de création de notification(s) de type ${type}`,
        error,
      );
    }
  }

  async findAllForUser(userId: string, filters: NotificationFiltersDto) {
    const { page = 0, pageSize = 15, order = "desc" } = filters;
    return this.prisma.notification.paginate({
      where: { userId },
      orderBy: { createdAt: order },
      page,
      pageSize,
    });
  }

  async countUnread(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async markAsRead(userId: string, id: string) {
    const { count } = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
    if (count === 0) {
      throw new NotFoundException(`Notification avec l'id ${id} non trouvée`);
    }
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async delete(userId: string, id: string) {
    const { count } = await this.prisma.notification.deleteMany({
      where: { id, userId },
    });
    if (count === 0) {
      throw new NotFoundException(`Notification avec l'id ${id} non trouvée`);
    }
  }

  async deleteMany(userId: string, ids: string[]) {
    await this.prisma.notification.deleteMany({
      where: { id: { in: ids }, userId },
    });
  }

  /**
   * Renvoie l'e-mail effectivement envoyé pour le même événement que cette notification, si
   * un tel e-mail existe : c'est ce contenu qui s'affiche au clic plutôt qu'une redirection
   * (#2280 — suite). 404 si la notification n'appartient pas à l'utilisateur ou si aucun
   * e-mail n'y est rattaché.
   */
  async findEmailForNotification(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
      select: { emailLogId: true },
    });
    if (!notification?.emailLogId) {
      throw new NotFoundException(
        "Aucun e-mail n'est associé à cette notification",
      );
    }
    const emailLog = await this.prisma.emailLog.findUnique({
      where: { id: notification.emailLogId },
    });
    if (!emailLog) {
      throw new NotFoundException(
        "Aucun e-mail n'est associé à cette notification",
      );
    }
    return emailLog;
  }

  /**
   * Résout les utilisateurs habilités à gérer les signalements (Permission.ReportManage),
   * globalement ou pour une application donnée. Aucun helper inverse n'existe côté
   * CheckPermissions (qui ne fait que "cet utilisateur a-t-il la permission ?") : on
   * recombine ici les deux couches qui accordent ReportManage.
   *
   * Hors scope : le canal "acteur groupe" (organisation entière via QueryBuilderGroupActor)
   * n'est pas reproduit ici, le rôle global CONTRIBUTOR+ couvrant déjà la majorité des cas.
   */
  /**
   * Utilisateurs à prévenir d'une fin de vie sur une application (#2236) : les acteurs qui peuvent
   * agir sur sa stack technique, c'est-à-dire ceux dont le type d'acteur porte `TechnologyWrite`.
   *
   * Volontairement PAS de repli sur les rôles globaux, contrairement aux signalements : une fin de
   * vie appelle une action sur une application précise, et prévenir tous les administrateurs à
   * chaque technologie périmée du référentiel noierait le signal.
   */
  async findUsersToNotifyForTechnology(
    applicationId: string,
  ): Promise<string[]> {
    const actors = await this.prisma.actor.findMany({
      where: {
        applicationId,
        isGroup: false,
        email: { not: null },
        actorType: { appPermissions: { some: { TechnologyWrite: true } } },
      },
      select: { email: true },
    });
    const emails = actors
      .map((actor) => actor.email)
      .filter((email): email is string => Boolean(email));
    if (emails.length === 0) return [];
    const users = await this.prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true },
    });
    return [...new Set(users.map((user) => user.id))];
  }

  async findUsersWithReportManagePermission(
    applicationId?: string,
  ): Promise<string[]> {
    const [roleUsers, additionalPermissionUsers, actorUsers] =
      await Promise.all([
        this.prisma.user.findMany({
          where: { role: { in: REPORT_MANAGE_ROLES } },
          select: { id: true },
        }),
        this.prisma.user.findMany({
          where: { additionalPermissions: { has: Permission.ReportManage } },
          select: { id: true },
        }),
        applicationId
          ? this.prisma.actor
              .findMany({
                where: {
                  applicationId,
                  isGroup: false,
                  email: { not: null },
                  actorType: {
                    appPermissions: { some: { ReportManage: true } },
                  },
                },
                select: { email: true },
              })
              .then((actors) =>
                this.prisma.user.findMany({
                  where: {
                    email: {
                      in: actors
                        .map((actor) => actor.email)
                        .filter((email): email is string => Boolean(email)),
                    },
                  },
                  select: { id: true },
                }),
              )
          : Promise.resolve([]),
      ]);

    return [
      ...new Set(
        [...roleUsers, ...additionalPermissionUsers, ...actorUsers].map(
          (user) => user.id,
        ),
      ),
    ];
  }
}
