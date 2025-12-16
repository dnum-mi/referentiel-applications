import type { Prisma } from "@prisma/client";
import { Injectable } from "@nestjs/common";
import { PaginatedResponseDto } from "src/common/dto";
import { paginate } from "src/common/utils/pagination.utils";
import { PrismaService } from "src/prisma/prisma.service";
import { ApplicationDto } from "src/product/application/dto/get-application.dto";
import { ApplicationWithAllRelations } from "src/product/types/application.type";
import { CreateTagDto } from "src/tag/dto/tag.dto";
import { CreateApplicationDto } from "../../application/dto/create-application.dto";
import {
  ApplicationSearchFilters,
  IApplicationRepository,
} from "./application.repository.interface";

@Injectable()
export class ApplicationRepository implements IApplicationRepository {
  constructor(private prisma: PrismaService) {}

  public async create(
    application: Omit<CreateApplicationDto, "status" | "labels">,
    existingTags: CreateTagDto[],
  ) {
    return this.prisma.application.create({
      data: {
        ...application,
        tags: {
          connect: existingTags,
        },
        labels: undefined,
        quality: 0,
      },
      include: {
        tags: true,
      },
    });
  }

  public async findById(id: string) {
    return this.prisma.application.findUnique({
      where: { id },
      include: {
        currentStatus: true, // Include the current status via FK
        relationsAsSource: {
          include: { targetApplication: { select: { id: true, label: true } } },
        },
        relationsAsTarget: {
          include: { sourceApplication: { select: { id: true, label: true } } },
        },
        tags: true,
      },
    });
  }

  public async findApplications(
    filters: ApplicationSearchFilters,
    ownership?: { actorEmail?: string },
  ): Promise<PaginatedResponseDto<ApplicationDto>> {
    const {
      shortName,
      priorityRestart,
      page,
      pageSize,
      sortBy = "shortName",
      order = "asc",
    } = filters;

    const safeOrder = order === "desc" ? "desc" : "asc";

    // Build a single comprehensive where clause with all filters
    const where: { AND: Prisma.ApplicationWhereInput[] } = { AND: [] };

    if (ownership) {
      if (ownership.actorEmail) {
        where.AND.push({
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
                    path: {
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
        condition: filters.missingMoa,
        whereClause: {
          actors: {
            none: {
              actorType: {
                code: {
                  equals: "MOA",
                  mode: "insensitive" as const,
                },
              },
            },
          },
        },
      },
      {
        condition: filters.missingMoe,
        whereClause: {
          actors: {
            none: {
              actorType: {
                code: {
                  equals: "MOE",
                  mode: "insensitive" as const,
                },
              },
            },
          },
        },
      },
      {
        condition: filters.missingHosting,
        whereClause: {
          hostings: {
            none: {},
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
        condition: filters.tag?.length,
        whereClause: {
          tags: {
            some: {
              name: {
                in: filters.tag,
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
        condition: priorityRestart?.length,
        whereClause: {
          priorityRestart: { in: priorityRestart },
        },
      },
      {
        condition:
          filters.currentStatus__in?.length || filters.currentStatus__isNull,
        whereClause: {
          OR: [
            {
              currentStatus: {
                status: { in: filters.currentStatus__in ?? [] },
              },
            },
            {
              currentStatus:
                filters.currentStatus__isNull === true ? null : undefined,
            },
          ],
        },
      },
    ];

    filters.compliance__in?.forEach((compliance) => {
      switch (compliance) {
        case "homologation":
          where.AND.push({
            compliance: {
              homologation_date_end: { not: null },
            },
          });
          break;
        case "dsfr":
          where.AND.push({
            compliance: {
              dsfr_implemented: true,
            },
          });
          break;
        case "rgaa":
          where.AND.push({
            compliance: {
              rgaa_audit_date: { not: null },
            },
          });
          break;
        case "pdma":
          where.AND.push({
            compliance: {
              pdma_duration_hours: { not: null },
            },
          });
          break;
        case "dima":
          where.AND.push({
            compliance: {
              dima_duration_hours: { not: null },
            },
          });
          break;
      }
    });

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
          currentStatus: true,
          hostings: {
            include: {
              hostingOption: true,
            },
          },
          actors: {
            include: {
              organization: {
                select: { id: true, path: true },
              },
              actorType: true,
            },
          },
          labels: true,
          externalRessource: true,
          tags: true,
        },
      }),
      this.prisma.application.count({ where }),
    ]);

    return new PaginatedResponseDto(results, total);
  }

  async findAllWithFullRelations(): Promise<ApplicationWithAllRelations[]> {
    return await this.prisma.application.findMany({
      include: {
        currentStatus: true,
        metadatas: true,
        compliance: true,
        labels: true,
        tags: true,
        externalRessource: true,
        anomalyNotification: true,
        statuses: true,
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

  public async delete(id: string): Promise<void> {
    await this.prisma.application.delete({
      where: { id },
    });
  }
}
