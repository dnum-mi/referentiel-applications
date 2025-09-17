import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateAnomalyNotificationDto } from "./dto/create-anomaly-notification.dto";
import { UpdateAnomalyNotificationDto } from "./dto/update-anomaly-notification.dto";
import { Prisma } from "@prisma/client";
import { AdminLevel, Requestor } from "src/user/entities/user.entity";

@Injectable()
export class AnomalyNotificationService {
  constructor(protected readonly prisma: PrismaService) {}

  /**
   * Crée une nouvelle notification d'anomalie.
   * @param data Les données nécessaires pour créer la notification.
   * @returns La notification d'anomalie créée.
   */
  public async create(data: CreateAnomalyNotificationDto, requestor: Requestor) {
    if (!requestor.appPerms.includes("postAnomalyNotifications")) {
      throw new ForbiddenException("Vous n'avez pas la permission de créer une notification d'anomalie.");
    }
    return this.prisma.anomalyNotification.create({
      data: {
        application: {
          connect: { id: data.applicationId },
        },
        notifier: {
          connect: { id: requestor.id },
        },
        description: data.description,
      },
    });
  }

  /**
   * Récupère toutes les notifications d'anomalies.
   * @returns Un tableau de notifications d'anomalies.
   */
  async findAll({
    applicationId,
    requestor,
    notifierId,
  }: {
    applicationId?: string
    notifierId?: string
    requestor: Requestor
  }) {
    const where: Prisma.AnomalyNotificationWhereInput = {
      applicationId,
      notifierId,
    };

    // Controle des permissions
    const hasApplicationReadPerms = requestor.appPerms?.includes("readAnomalyNotifications");
    const isAdminRead = requestor.adminLevel >= AdminLevel.READ;

    if (applicationId) {
      if (!hasApplicationReadPerms && !isAdminRead) {
        where.notifierId = requestor.id;
      }
    } else if (!isAdminRead) {
      where.notifierId = requestor.id;
    }

    return this.prisma.anomalyNotification.findMany({
      include: { history: true, application: true, notifier: true },
      where,
    });
  }

  /**
   * Récupère une notification d'anomalie par son ID.
   * @param id L'identifiant de la notification.
   * @returns La notification d'anomalie trouvée.
   * @throws NotFoundException Si la notification n'est pas trouvée.
   */
  async findOne(id: string, requestor: Requestor) {
    const hasApplicationReadPerms
    = requestor.appPerms?.includes("readAnomalyNotifications")
      || requestor.appPerms?.includes("manageAnomalyNotifications")
      || requestor.adminLevel >= AdminLevel.READ;

    const where: Prisma.AnomalyNotificationWhereUniqueInput = {
      id,
      ...(hasApplicationReadPerms ? {} : { notifierId: requestor.id }),
    };

    const notification = await this.prisma.anomalyNotification.findUnique({
      where,
      include: { history: true, application: true },
    });
    if (!notification) {
      throw new NotFoundException(`Notification avec l'id ${id} non trouvée`);
    }

    return notification;
  }

  /**
   * Met à jour une notification d'anomalie existante.
   * @param id L'identifiant de la notification.
   * @param data Les données de mise à jour.
   * @returns La notification d'anomalie mise à jour.
   * @throws NotFoundException Si la notification n'est pas trouvée.
   */
  async update(id: string, data: UpdateAnomalyNotificationDto) {
    return this.prisma.anomalyNotification.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.anomalyNotification.delete({
      where: { id },
    });
  }
}
