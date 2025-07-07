import { applicationMap } from '../../application/map/application.map';
import { IApplicationRepository } from './application.repository.interface';

import { Injectable } from '@nestjs/common';
import { CreateApplicationDto } from '../../application/dto/create-application.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, ApplicationsExport } from '@prisma/client';

import { ApplicationSearchDto } from './../../application/dto/search-application.dto';
import { ApplicationWithAllRelations } from 'src/product/types/application.type';

@Injectable()
export class ApplicationRepository implements IApplicationRepository {
  constructor(private prisma: PrismaService) {}

  public async create(application: CreateApplicationDto, ownerId: string) {
    const mappedData = applicationMap(application, ownerId);
    return await this.prisma.application.create(mappedData);
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
        actors: true,
        relationsAsSource: {
          include: { targetApplication: { select: { id: true, label: true } } },
        },
        relationsAsTarget: {
          include: { sourceApplication: { select: { id: true, label: true } } },
        },
        metadatas: {
          include: { createdBy: { select: { email: true } } },
        },
      },
    });
  }

  async findApplicationsBySearch(
    dto: ApplicationSearchDto,
  ): Promise<{ results: any[]; total: number }> {
    const {
      shortName,
      tag,
      priorityRestart,
      page = 0,
      limit = 15,
      sortBy = 'shortName',
      order = 'asc',
    } = dto;

    const safeOrder = order === 'desc' ? 'desc' : 'asc';
    const upperCaseTags = tag?.map((t) => t.toUpperCase()) || [];

    // Build a single comprehensive where clause with all filters
    const whereConditions: Prisma.ApplicationWhereInput[] = [];

    // Label filter - search both main label field and labels table
    if (dto.label) {
      whereConditions.push({
        OR: [
          {
            label: {
              contains: dto.label,
              mode: 'insensitive' as const,
            },
          },
          {
            labels: {
              some: {
                value: {
                  contains: dto.label,
                  mode: 'insensitive' as const,
                },
              },
            },
          },
        ],
      });
    }

    // Hosting search filter
    if (dto.hostingSearch) {
      whereConditions.push({
        hostings: {
          some: {
            hostingOption: {
              OR: [
                {
                  site: {
                    contains: dto.hostingSearch,
                    mode: 'insensitive' as const,
                  },
                },
                {
                  platform: {
                    contains: dto.hostingSearch,
                    mode: 'insensitive' as const,
                  },
                },
                {
                  provider: {
                    contains: dto.hostingSearch,
                    mode: 'insensitive' as const,
                  },
                },
                {
                  building: {
                    contains: dto.hostingSearch,
                    mode: 'insensitive' as const,
                  },
                },
                {
                  room: {
                    contains: dto.hostingSearch,
                    mode: 'insensitive' as const,
                  },
                },
              ],
            },
          },
        },
      });
    }

    // Organization filter
    if (dto.organizationLabel) {
      whereConditions.push({
        actors: {
          some: {
            organization: {
              label: {
                contains: dto.organizationLabel,
                mode: 'insensitive' as const,
              },
            },
          },
        },
      });
    }

    // Actor type filter
    if (dto.actorType) {
      whereConditions.push({
        actors: {
          some: {
            actorType: {
              code: {
                equals: dto.actorType,
                mode: 'insensitive' as const,
              },
            },
          },
        },
      });
    }

    // Link filter
    if (dto.link) {
      whereConditions.push({
        externalRessource: {
          some: {
            link: {
              contains: dto.link,
              mode: 'insensitive' as const,
            },
          },
        },
      });
    }

    // Simple filters
    if (shortName) {
      whereConditions.push({
        shortName: { contains: shortName, mode: 'insensitive' as const },
      });
    }

    if (tag?.length) {
      whereConditions.push({
        tags: { hasSome: upperCaseTags },
      });
    }

    if (priorityRestart?.length) {
      whereConditions.push({
        priorityRestart: { in: priorityRestart },
      });
    }

    if (dto.status?.length) {
      whereConditions.push({
        status: { in: dto.status },
      });
    }

    whereConditions.push({
      quality: {
        gte: dto.iqGte,
        lte: dto.iqLte,
      },
    });

    const where: Prisma.ApplicationWhereInput =
      whereConditions.length > 0 ? { AND: whereConditions } : {};

    const total = await this.prisma.application.count({ where });

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

    const results = await this.prisma.application.findMany({
      where,
      orderBy,
      skip: page * limit,
      take: limit,
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
    });

    return { results, total };
  }

  async findAllWithRelations(): Promise<ApplicationWithAllRelations[]> {
    return this.prisma.application.findMany({
      include: {
        metadatas: true,
        owner: true,
        compliances: true,
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
        compliances: true,
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

  async findByLink(link: string): Promise<any[]> {
    const results = await this.prisma.externalRessource.findMany({
      where: { link },
      include: { application: true },
    });
    return results.map((r) => r.application);
  }

  async findAllForDetailedExport(): Promise<ApplicationsExport[]> {
    return this.prisma.applicationsExport.findMany({
      orderBy: { application: 'asc' },
    });
  }

  async findDetailedExportBySearch(
    searchDto: ApplicationSearchDto,
  ): Promise<ApplicationsExport[]> {
    const searchResult = await this.findApplicationsBySearch(searchDto);
    const applicationIds = searchResult.results.map((app) => app.id);

    return this.prisma.applicationsExport.findMany({
      where: {
        id: {
          in: applicationIds,
        },
      },
      orderBy: { application: 'asc' },
    });
  }

  public async delete(id: string): Promise<void> {
    await this.prisma.application.delete({
      where: { id },
    });
  }
}
