import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateAnomalyNotificationDto } from "./dto/create-anomaly-notification.dto";
import { UpdateAnomalyNotificationDto } from "./dto/update-anomaly-notification.dto";
import { BaseService } from "src/common/base.service";
import { AnomalyNotification } from "./entities/anomaly-notification.entity";

@Injectable()
export class AnomalyNotificationService extends BaseService<AnomalyNotification> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma.anomalyNotification, prisma);
  }

  /**
   * Crée une nouvelle notification d'anomalie.
   * @param data Les données nécessaires pour créer la notification.
   * @returns La notification d'anomalie créée.
   */
  public async create(data: CreateAnomalyNotificationDto) {
    return await this.prisma.anomalyNotification.create({
      data: {
        application: {
          connect: { id: data.applicationId },
        },
        notifier: {
          connect: { keycloakId: data.notifierId },
        },
        description: data.description,
      },
    });
  }

  /**
   * Récupère toutes les notifications d'anomalies.
   * @returns Un tableau de notifications d'anomalies.
   */
  async findAll(filters?: any) {
    return await this.prisma.anomalyNotification.findMany({
      include: { history: true, application: true, notifier: true },
      where: filters,
    });
  }

  /**
   * Récupère une notification d'anomalie par son ID.
   * @param id L'identifiant de la notification.
   * @returns La notification d'anomalie trouvée.
   * @throws NotFoundException Si la notification n'est pas trouvée.
   */
  async findOne(id: string) {
    const notification = await this.prisma.anomalyNotification.findUnique({
      where: { id },
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
    await this.findOne(id);
    return await this.prisma.anomalyNotification.update({
      where: { id },
      data,
    });
  }
}
