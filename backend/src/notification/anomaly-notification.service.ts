import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAnomalyNotificationDto } from './dto/create-anomaly-notification.dto';
import { UpdateAnomalyNotificationDto } from './dto/update-anomaly-notification.dto';
import { GetAnomalyNotificationDto } from './dto/get-anomaly-notification.dto';
import { AuthUtils } from '../utils/helpers';

@Injectable()
export class AnomalyNotificationService {
  constructor(private readonly prisma: PrismaService) {}
  /**
   * Crée une nouvelle notification d'anomalie.
   * @param req La requête HTTP de l'utilisateur.
   * @param data Les données nécessaires pour créer la notification.
   * @returns La notification d'anomalie créée.
   */
  public async create(req: Request, data: CreateAnomalyNotificationDto) {
    const decodedToken = AuthUtils.getDecodedToken(req);
    const notifierId = decodedToken.sub;

    const correctionDemand = await this.prisma.anomalyNotification.create({
      data: {
        application: {
          connect: { id: data.applicationId },
        },
        notifier: {
          connect: { keycloakId: notifierId },
        },
        description: data.description,
        status: data.status,
      },
    });

    return correctionDemand;
  }

  /**
   * Récupère toutes les notifications d'anomalies.
   * @returns Un tableau de notifications d'anomalies.
   */
  async findAll() {
    const notifications = await this.prisma.anomalyNotification.findMany({
      include: { history: true, application: true },
    });

    return notifications;
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

  public async getAnomalyNotificationByNotifierId(
    notifierId: string,
  ): Promise<GetAnomalyNotificationDto[]> {
    const anomalyNotifications = await this.prisma.anomalyNotification.findMany(
      {
        where: { notifierId },
        include: { history: true, application: true },
      },
    );
    const anomalyNotificationDtos = anomalyNotifications.map((anomaly) => ({
      id: anomaly.id,
      applicationId: anomaly.applicationId,
      application: {
        id: anomaly.application?.id,
        label: anomaly.application?.label,
        ownerId: anomaly.application?.ownerId,
      },
      notifierId: anomaly.notifierId,
      description: anomaly.description,
      status: anomaly.status,
      createdAt: anomaly.createdAt,
      updatedAt: anomaly.updatedAt || null,
    }));

    return anomalyNotificationDtos;
  }

  public async getAnomalyNotificationByApplicationId(
    applicationId: string,
  ): Promise<GetAnomalyNotificationDto[]> {
    const anomalyNotifications = await this.prisma.anomalyNotification.findMany(
      {
        where: { applicationId },
        include: {
          history: true,
          application: true,
          notifier: true,
        },
      },
    );

    if (!anomalyNotifications || anomalyNotifications.length === 0) {
      throw new Error(
        'Aucune notification de signalement trouvée pour cette application',
      );
    }

    return anomalyNotifications.map((anomaly) => ({
      id: anomaly.id,
      applicationId: anomaly.applicationId,
      application: {
        id: anomaly.application?.id,
        label: anomaly.application?.label,
        ownerId: anomaly.application?.ownerId,
      },
      notifierId: anomaly.notifierId,
      notifier: {
        email: anomaly.notifier?.email || 'Non disponible', // Accéder à l'email de l'utilisateur via la relation
      },
      description: anomaly.description,
      status: anomaly.status,
      createdAt: anomaly.createdAt,
      updatedAt: anomaly.updatedAt || null,
    }));
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

    const updatedNotification = await this.prisma.anomalyNotification.update({
      where: { id },
      data,
    });

    return updatedNotification;
  }

  /**
   * Met à jour une notification d'anomalie existante.
   * @param id L'identifiant de la notification.
   * @param status Le nouveau statut.
   * @returns La notification d'anomalie mise à jour.
   * @throws NotFoundException Si la notification n'est pas trouvée.
   */
  async updateStatus(id: string, data: UpdateAnomalyNotificationDto) {
    const { status } = data;

    await this.findOne(id);

    const updatedNotification = await this.prisma.anomalyNotification.update({
      where: { id },
      data: { status },
    });

    return updatedNotification;
  }

  /**
   * Supprime une notification d'anomalie.
   * @param id L'identifiant de la notification.
   * @returns La notification d'anomalie supprimée.
   * @throws NotFoundException Si la notification n'est pas trouvée.
   */
  async remove(id: string) {
    try {
      await this.findOne(id);

      const deletedNotification = await this.prisma.anomalyNotification.delete({
        where: { id },
      });

      return deletedNotification;
    } catch (error) {
      throw error;
    }
  }
}
