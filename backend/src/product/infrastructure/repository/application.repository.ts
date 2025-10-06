import { applicationMap } from "../../application/map/application.map";
import { ApplicationSearchFilters, IApplicationRepository } from "./application.repository.interface";

import { Injectable } from "@nestjs/common";
import { CreateApplicationDto } from "../../application/dto/create-application.dto";
import { PrismaService } from "src/prisma/prisma.service";
import type { Prisma } from "@prisma/client";
import { ApplicationWithAllRelations } from "src/product/types/application.type";
import { ApplicationDto } from "src/product/application/dto/get-application.dto.js";
import { paginate } from "src/common/utils/pagination.utils";
import { PaginatedResponseDto } from "src/common/dto";

@Injectable()
export class ApplicationRepository implements IApplicationRepository {
  constructor(private prisma: PrismaService) {}

  public async create(application: CreateApplicationDto, ownerId: string) {
    const mappedData = applicationMap(application, ownerId);
    return this.prisma.application.create({
      data: { ...mappedData.data, quality: 0 },
    });
  }

  public async findById(id: string) {
    return await this.prisma.application.findUnique({
      where: { id },
      include: {
        relationsAsSource: {
          include: { targetApplication: { select: { id: true, label: true } } },
        },
        relationsAsTarget: {
          include: { sourceApplication: { select: { id: true, label: true } } },
        },
      },
    });
  }

  async findApplications(
    filters: ApplicationSearchFilters,
    ownership?: { actorEmail?: string, ownerId?: string },
  ): Promise<PaginatedResponseDto<ApplicationDto>> {
    const {
      shortName,
      tag,
      priorityRestart,
      page,
      pageSize,
      sortBy = "shortName",
      order = "asc",
    } = filters;

    const safeOrder = order === "desc" ? "desc" : "asc";
    const upperCaseTags = tag?.map(t => t.toUpperCase()) || [];

    // Build a single comprehensive where clause with all filters
    const where: { AND: Prisma.ApplicationWhereInput[] } = { AND: [] };

    if (ownership) {
      const ownershipWhere: Prisma.ApplicationWhereInput = { OR: [] };
      if (ownership.actorEmail) {
        ownershipWhere.OR.push({
          actors: {
            some: {
              email: {
                equals: ownership.actorEmail,
                mode: "insensitive" as const,
              },
            },
          },
        });
      }
      if (ownership.ownerId) {
        ownershipWhere.OR.push({ ownerId: ownership.ownerId });
      }
      if (ownershipWhere.OR.length > 0) {
        where.AND.push(ownershipWhere);
      }
    }

    const filterConfigs = [
      {
        condition: filters.label,
        whereClause: {
          OR: [
            {
              label: {
                contains: filters.label,
                mode: "insensitive" as const,
              },
            },
            {
              labels: {
                some: {
                  value: {
                    contains: filters.label,
                    mode: "insensitive" as const,
                  },
                },
              },
            },
          ],
        },
      },
      {
        condition: filters.search,
        whereClause: {
          OR: [
            {
              label: {
                contains: filters.search,
                mode: "insensitive" as const,
              },
            },
            {
              labels: {
                some: {
                  value: {
                    contains: filters.search,
                    mode: "insensitive" as const,
                  },
                },
              },
            },
            {
              shortName: {
                contains: filters.search,
                mode: "insensitive" as const,
              },
            },
          ],
        },
      },
      {
        condition: filters.hostingSite,
        whereClause: {
          hostings: {
            some: {
              hostingOption: {
                site: {
                  contains: filters.hostingSite,
                  mode: "insensitive" as const,
                },
              },
            },
          },
        },
      },
      {
        condition: filters.hostingPlatform,
        whereClause: {
          hostings: {
            some: {
              hostingOption: {
                platform: {
                  contains: filters.hostingPlatform,
                  mode: "insensitive" as const,
                },
              },
            },
          },
        },
      },
      {
        condition: filters.hostingProvider,
        whereClause: {
          hostings: {
            some: {
              hostingOption: {
                provider: {
                  contains: filters.hostingProvider,
                  mode: "insensitive" as const,
                },
              },
            },
          },
        },
      },
      {
        condition: filters.hostingBuilding,
        whereClause: {
          hostings: {
            some: {
              hostingOption: {
                building: {
                  contains: filters.hostingBuilding,
                  mode: "insensitive" as const,
                },
              },
            },
          },
        },
      },
      {
        condition: filters.hostingRoom,
        whereClause: {
          hostings: {
            some: {
              hostingOption: {
                room: {
                  contains: filters.hostingRoom,
                  mode: "insensitive" as const,
                },
              },
            },
          },
        },
      },
      {
        condition: filters.organization,
        whereClause: {
          actors: {
            some: {
              organization: {
                OR: [
                  {
                    label: {
                      contains: filters.organization,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    sigle: {
                      contains: filters.organization,
                      mode: "insensitive" as const,
                    },
                  },
                ],
              },
            },
          },
        },
      },
      {
        condition: filters.actorType,
        whereClause: {
          actors: {
            some: {
              actorType: {
                code: {
                  equals: filters.actorType,
                  mode: "insensitive" as const,
                },
              },
            },
          },
        },
      },
      {
        condition: filters.actorEmail,
        whereClause: {
          actors: {
            some: {
              email: {
                equals: filters.actorEmail,
                mode: "insensitive" as const,
              },
            },
          },
        },
      },
      {
        condition: filters.link,
        whereClause: {
          externalRessource: {
            some: {
              link: {
                contains: filters.link,
                mode: "insensitive" as const,
              },
            },
          },
        },
      },
      {
        condition: shortName,
        whereClause: {
          shortName: { contains: shortName, mode: "insensitive" as const },
        },
      },
      {
        condition: tag?.length,
        whereClause: {
          tags: { hasSome: upperCaseTags },
        },
      },
      {
        condition: priorityRestart?.length,
        whereClause: {
          priorityRestart: { in: priorityRestart },
        },
      },
      {
        condition: filters.status__in?.length,
        whereClause: {
          status: { in: filters.status__in },
        },
      },
    ];

    // Apply all filters using the configuration array
    filterConfigs.forEach(({ condition, whereClause }) => {
      if (condition) {
        where.AND.push(whereClause);
      }
    });

    // Always add quality filter
    where.AND.push({
      quality: {
        gte: filters.iqGte,
        lte: filters.iqLte,
      },
    });

    // Handle different sorting options with fallback
    const sortOptions: Record<
      string,
      Prisma.ApplicationOrderByWithRelationInput
    > = {
      hostingSite: { hostings: { _count: safeOrder } },
      shortName: { shortName: safeOrder },
      priorityRestart: { priorityRestart: safeOrder },
      quality: { quality: safeOrder },
      label: { label: safeOrder },
    };

    const orderBy = sortOptions[sortBy] || { shortName: safeOrder };

    const [results, total] = await Promise.all([
      this.prisma.application.findMany({
        where,
        orderBy,
        ...paginate(page, pageSize),
        include: {
          hostings: {
            include: {
              hostingOption: true,
            },
          },
          actors: {
            include: {
              organization: {
                select: { id: true, label: true },
              },
              actorType: true,
            },
          },
          labels: true,
          externalRessource: true,
        },
      }),
      this.prisma.application.count({ where }),
    ]);

    return new PaginatedResponseDto(results, total);
  }

  async findAllWithRelations(): Promise<ApplicationWithAllRelations[]> {
    return this.prisma.application.findMany({
      include: {
        metadatas: true,
        owner: true,
        compliance: true,
        labels: true,
        externalRessource: true,
        anomalyNotification: true,
        actors: {
          include: {
            actorType: true,
          },
        },
        hostings: {
          include: {
            hostingOption: true,
          },
        },
        relationsAsSource: {
          include: { targetApplication: true },
        },
        relationsAsTarget: {
          include: { sourceApplication: true },
        },
      },
    });
  }

  async exportAllApplicationsFull(): Promise<any[]> {
    return this.prisma.application.findMany({
      include: {
        metadatas: true,
        compliance: true,
        labels: true,
        actors: true,
        relationsAsSource: {
          include: { targetApplication: true },
        },
        relationsAsTarget: {
          include: { sourceApplication: true },
        },
        hostings: {
          include: {
            hostingOption: true,
          },
        },
        owner: true,
      },
    });
  }

  public async delete(id: string): Promise<void> {
    await this.prisma.application.delete({
      where: { id },
    });
  }
}
