import { applicationMap } from "../../application/map/application.map";
import { ApplicationSearchFilters, IApplicationRepository } from "./application.repository.interface";

import { Injectable } from "@nestjs/common";
import { CreateApplicationDto } from "../../application/dto/create-application.dto";
import { PrismaService } from "src/prisma/prisma.service";
import type { Prisma } from "@prisma/client";
import { ApplicationWithAllRelations } from "src/product/types/application.type";
import { ApplicationDto } from "src/product/application/dto/get-application.dto.js";

@Injectable()
export class ApplicationRepository implements IApplicationRepository {
  constructor(private prisma: PrismaService) {}

  public async create(application: CreateApplicationDto, ownerId: string) {
    const mappedData = applicationMap(application, ownerId);
    return this.prisma.application.create({
      data: { ...mappedData.data, quality: 0 },
    });
  }

  public async findAll() {
    return await this.prisma.application.findMany({
      include: {
        actors: true,
        relationsAsSource: { include: { targetApplication: true } },
        relationsAsTarget: { include: { sourceApplication: true } },
      },
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

  async findApplicationsBySearch(
    filters: ApplicationSearchFilters,
    ownership?: { actorEmail?: string, ownerId?: string },
  ): Promise<{ results: ApplicationDto[], total: number }> {
    const {
      shortName,
      tag,
      priorityRestart,
      page,
      limit,
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

    // Label filter - search both main label field and labels table
    if (filters.label) {
      where.AND.push({
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
      });
    }

    // Label filter - search both main label field and labels table
    if (filters.search) {
      where.AND.push({
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
                  contains: filters.label,
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
      });
    }

    // Hosting search filter
    if (filters.hostingSearch) {
      where.AND.push({
        hostings: {
          some: {
            hostingOption: {
              OR: [
                {
                  site: {
                    contains: filters.hostingSearch,
                    mode: "insensitive" as const,
                  },
                },
                {
                  platform: {
                    contains: filters.hostingSearch,
                    mode: "insensitive" as const,
                  },
                },
                {
                  provider: {
                    contains: filters.hostingSearch,
                    mode: "insensitive" as const,
                  },
                },
                {
                  building: {
                    contains: filters.hostingSearch,
                    mode: "insensitive" as const,
                  },
                },
                {
                  room: {
                    contains: filters.hostingSearch,
                    mode: "insensitive" as const,
                  },
                },
              ],
            },
          },
        },
      });
    }

    // Organization filter
    if (filters.organizationLabel) {
      where.AND.push({
        actors: {
          some: {
            organization: {
              label: {
                contains: filters.organizationLabel,
                mode: "insensitive" as const,
              },
            },
          },
        },
      });
    }

    // Actor type filter
    if (filters.actorType) {
      where.AND.push({
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
      });
    }

    // Link filter
    if (filters.link) {
      where.AND.push({
        externalRessource: {
          some: {
            link: {
              contains: filters.link,
              mode: "insensitive" as const,
            },
          },
        },
      });
    }

    // Simple filters
    if (shortName) {
      where.AND.push({
        shortName: { contains: shortName, mode: "insensitive" as const },
      });
    }

    if (tag?.length) {
      where.AND.push({
        tags: { hasSome: upperCaseTags },
      });
    }

    if (priorityRestart?.length) {
      where.AND.push({
        priorityRestart: { in: priorityRestart },
      });
    }

    if (filters.status__in?.length) {
      where.AND.push({
        status: { in: filters.status__in },
      });
    }

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
        // disable pagination if limit is 0 or not provided
        skip: (limit && limit > 0 && page) ? page * limit : undefined,
        take: limit && limit > 0 ? limit : undefined,
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

    return { results, total };
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
