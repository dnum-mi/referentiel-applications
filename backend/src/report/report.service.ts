import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AdminLevel, Requestor } from "src/user/entities/user.entity";
import { PrismaService } from "../prisma/prisma.service";
import { ReportFiltersDto, SortByEnum } from "./dto/report-filters.dto";
import { CreateReportDto } from "./dto/create-report.dto";
import { UpdateReportDto } from "./dto/update-report.dto";

@Injectable()
export class ReportsService {
  constructor(protected readonly prisma: PrismaService) {}

  /**
   * Crée un nouveau signalement.
   * @param data Les données nécessaires pour créer le signalement.
   * @returns Le signalement créé.
   */
  public async create(
    data: CreateReportDto,
    requestor: Requestor,
    applicationId?: string,
  ) {
    const hasPostPerm = requestor.appPerms?.includes("postReports") === true;
    const isAdminWriteOrMore = requestor.adminLevel >= AdminLevel.WRITE;
    if (applicationId) {
      if (!hasPostPerm && !isAdminWriteOrMore) {
        throw new ForbiddenException(
          "Vous n'avez pas la permission de créer un signalement pour cette application.",
        );
      }
    } else if (!requestor.capabilities.includes("CreateGlobalReport")) {
      throw new ForbiddenException(
        "Vous n'avez pas la permission de créer un signalement.",
      );
    }

    return this.prisma.report.create({
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
   * Récupère tous les signalements.
   * @returns Un tableau de signalements.
   */
  async findAll(
    requestor: Requestor,
    filters: ReportFiltersDto,
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
    const hasApplicationReadPerms = requestor.appPerms?.includes("readReports");
    const isAdminRead = requestor.adminLevel >= AdminLevel.READ;
    const canReadAll = hasApplicationReadPerms || isAdminRead;

    const where: { AND: Prisma.ReportWhereInput[] } = { AND: [] };

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
      Prisma.ReportOrderByWithRelationInput
    > = {
      application: { application: { label: order } },
      description: { description: order },
      date: { createdAt: order },
      status: { status: order },
      signalant: { notifier: { email: order } },
      notes: { notes: order },
    };

    const orderBy = sortOptions[sortBy];

    return this.prisma.report.paginate({
      where,
      orderBy,
      page,
      pageSize: limit,
      include: { history: true, application: true, notifier: true },
    });
  }

  /**
   * Récupère un signalement par son ID.
   * @param id L'identifiant du signalement.
   * @returns Le signalement trouvé.
   * @throws NotFoundException Si le signalement n'est pas trouvé.
   */
  async findOne(id: string, requestor: Requestor) {
    const hasApplicationReadPerms =
      requestor.appPerms?.includes("readReports") ||
      requestor.appPerms?.includes("manageReports") ||
      requestor.adminLevel >= AdminLevel.READ;

    const where: Prisma.ReportWhereUniqueInput = {
      id,
      ...(hasApplicationReadPerms ? {} : { notifierId: requestor.id }),
    };

    const report = await this.prisma.report.findUnique({
      where,
      include: { history: true, application: true },
    });
    if (!report) {
      throw new NotFoundException(`Signalement avec l'id ${id} non trouvé`);
    }

    return report;
  }

  /**
   * Met à jour un signalement existant.
   * @param id L'identifiant du signalement.
   * @param data Les données de mise à jour.
   * @returns Le signalement mis à jour.
   * @throws NotFoundException Si le signalement n'est pas trouvé.
   */
  async update(id: string, data: UpdateReportDto) {
    return this.prisma.report.update({
      where: { id },
      data,
      include: {
        notifier: true,
        application: true,
      },
    });
  }

  async delete(id: string) {
    return this.prisma.report.delete({
      where: { id },
    });
  }
}
