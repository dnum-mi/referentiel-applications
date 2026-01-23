import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AdminLevel, Requestor } from "src/user/entities/user.entity";
import { PrismaService } from "../prisma/prisma.service";
import { AnomalyFiltersDto, SortByEnum } from "./dto/anomaly-filters.dto";
import { CreateAnomalyNotificationDto } from "./dto/create-anomaly-notification.dto";
import { UpdateAnomalyNotificationDto } from "./dto/update-anomaly-notification.dto";

@Injectable()
export class AnomalyNotificationsService {
  constructor(protected readonly prisma: PrismaService) {}

  /**
   * Crée une nouvelle notification d'anomalie.
   * @param data Les données nécessaires pour créer la notification.
   * @returns La notification d'anomalie créée.
   */
  public async create(
    data: CreateAnomalyNotificationDto,
    requestor: Requestor,
    applicationId?: string,
  ) {
    const hasPostPerm =
      requestor.appPerms?.includes("postAnomalyNotifications") === true;
    const isAdminWriteOrMore = requestor.adminLevel >= AdminLevel.WRITE;
    if (applicationId) {
      if (!hasPostPerm && !isAdminWriteOrMore) {
        throw new ForbiddenException(
          "Vous n'avez pas la permission de créer une notification d'anomalie pour cette application.",
        );
      }
    } else if (
      !requestor.capabilities.includes("CreateGlobalAnomalyNotification")
    ) {
      throw new ForbiddenException(
        "Vous n'avez pas la permission de créer une notification d'anomalie.",
      );
    }

    return this.prisma.anomalyNotification.create({
      data: {
        ...(applicationId && {
          application: {
            connect: { id: applicationId },
          },
        }),
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
  async findAll(
    requestor: Requestor,
    filters: AnomalyFiltersDto,
    applicationId?: string,
  ) {
    const {
      searchReport,
      sortBy = "date",
      order = "asc",
      page = 0,
      limit = 15,
      all,
    } = filters;

    // Controle des permissions
    const hasApplicationReadPerms = requestor.appPerms?.includes(
      "readAnomalyNotifications",
    );
    const isAdminRead = requestor.adminLevel >= AdminLevel.READ;
    const canReadAll = hasApplicationReadPerms || isAdminRead;

    const where: { AND: Prisma.AnomalyNotificationWhereInput[] } = { AND: [] };

    if (applicationId) {
      if (!canReadAll || !all) {
        where.AND.push({
          notifierId: {
            equals: requestor.id,
          },
        });
      }

      where.AND.push({
        applicationId: {
          equals: applicationId,
        },
      });
    } else if (!isAdminRead || !all) {
      where.AND.push({
        notifierId: {
          equals: requestor.id,
        },
      });
    }

    if (searchReport) {
      where.AND.push({
        OR: [
          {
            application: {
              label: {
                contains: searchReport,
                mode: "insensitive" as const,
              },
            },
          },
          {
            description: {
              contains: searchReport,
              mode: "insensitive" as const,
            },
          },
        ],
      });
    }

    const sortOptions: Record<
      keyof typeof SortByEnum,
      Prisma.AnomalyNotificationOrderByWithRelationInput
    > = {
      application: { application: { label: order } },
      description: { description: order },
      date: { createdAt: order },
      status: { status: order },
      signalant: { notifier: { email: order } },
    };

    const orderBy = sortOptions[sortBy];

    return this.prisma.anomalyNotification.paginate({
      where,
      orderBy,
      page,
      pageSize: limit,
      include: { history: true, application: true, notifier: true },
    });
  }

  /**
   * Récupère une notification d'anomalie par son ID.
   * @param id L'identifiant de la notification.
   * @returns La notification d'anomalie trouvée.
   * @throws NotFoundException Si la notification n'est pas trouvée.
   */
  async findOne(id: string, requestor: Requestor) {
    const hasApplicationReadPerms =
      requestor.appPerms?.includes("readAnomalyNotifications") ||
      requestor.appPerms?.includes("manageAnomalyNotifications") ||
      requestor.adminLevel >= AdminLevel.READ;

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
