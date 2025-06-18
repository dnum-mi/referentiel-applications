import { applicationMap } from '../../application/map/application.map';
import { IApplicationRepository } from './application.repository.interface';

import { Injectable } from '@nestjs/common';
import { CreateApplicationDto } from '../../application/dto/create-application.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

import {
  ListApplicationDto,
  SearchApplicationDto,
} from './../../application/dto/search-application.dto';
import {
  buildLabelFilter,
  buildPriorityFilter,
  buildShortNameFilter,
  buildTagFilters,
  buildHostingSearchFilter,
} from './search.utils';
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
    dto: ListApplicationDto,
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

    const filters = [
      {
        key: 'label',
        enabled: !!dto.label,
        query: () =>
          Prisma.sql`
          SELECT a.id
          FROM public.applications a
          WHERE EXISTS (
            SELECT 1
            FROM public.labels l
            WHERE (LOWER(l.value) LIKE ${`%${dto.label!.toLowerCase()}%`})
              AND l."applicationId" = a.id
          )
        `,
      },
      {
        key: 'hosting',
        enabled:
          !!dto.hostingSite ||
          !!dto.hostingPlatform ||
          !!dto.hostingProvider ||
          !!dto.hostingBuilding ||
          !!dto.hostingRoom,
        query: () =>
          Prisma.sql`
          SELECT DISTINCT a.id
          FROM public.applications a
          LEFT JOIN public."Hosting" h ON h."applicationId" = a.id
          LEFT JOIN public."HostingOption" ho ON h."hostingOptionId" = ho.id
          WHERE (
            (
              ${dto.hostingSite ? Prisma.sql`LOWER(ho.site) LIKE ${`%${dto.hostingSite?.toLowerCase() ?? ''}%`}` : Prisma.sql`TRUE`}
              AND ${dto.hostingPlatform ? Prisma.sql`LOWER(ho.platform) LIKE ${`%${dto.hostingPlatform?.toLowerCase() ?? ''}%`}` : Prisma.sql`TRUE`}
              AND ${dto.hostingProvider ? Prisma.sql`LOWER(ho.provider) LIKE ${`%${dto.hostingProvider?.toLowerCase() ?? ''}%`}` : Prisma.sql`TRUE`}
              AND ${dto.hostingBuilding ? Prisma.sql`LOWER(ho.building) LIKE ${`%${dto.hostingBuilding?.toLowerCase() ?? ''}%`}` : Prisma.sql`TRUE`}
              AND ${dto.hostingRoom ? Prisma.sql`LOWER(ho.room) LIKE ${`%${dto.hostingRoom?.toLowerCase() ?? ''}%`}` : Prisma.sql`TRUE`}
            )
          )
        `,
      },
      {
        key: 'hostingSearch',
        enabled: !!dto.hostingSearch,
        query: () =>
          Prisma.sql`
          SELECT DISTINCT a.id
          FROM public.applications a
          LEFT JOIN public."Hosting" h ON h."applicationId" = a.id
          LEFT JOIN public."HostingOption" ho ON h."hostingOptionId" = ho.id
          WHERE (
            LOWER(ho.site) LIKE ${`%${dto.hostingSearch?.toLowerCase() ?? ''}%`} OR
            LOWER(ho.platform) LIKE ${`%${dto.hostingSearch?.toLowerCase() ?? ''}%`} OR
            LOWER(ho.provider) LIKE ${`%${dto.hostingSearch?.toLowerCase() ?? ''}%`} OR
            (ho.building IS NOT NULL AND LOWER(ho.building) LIKE ${`%${dto.hostingSearch?.toLowerCase() ?? ''}%`}) OR
            (ho.room IS NOT NULL AND LOWER(ho.room) LIKE ${`%${dto.hostingSearch?.toLowerCase() ?? ''}%`})
          )
        `,
      },
      {
        key: 'organizationLabel',
        enabled: !!dto.organizationLabel,
        query: () =>
          Prisma.sql`
          SELECT DISTINCT a.id
          FROM public.applications a
          JOIN public.actors act ON act."applicationId" = a.id
          JOIN public."Organization" org ON act."organizationId" = org.id
          WHERE LOWER(org.label) LIKE ${`%${dto.organizationLabel!.toLowerCase()}%`}
        `,
      },
      {
        key: 'actorType',
        enabled: !!dto.actorType,
        query: () =>
          Prisma.sql`
          SELECT DISTINCT a.id
          FROM public.applications a
          JOIN public.actors act ON act."applicationId" = a.id
          JOIN public."actorTypes" at ON act."actorTypeId" = at.id 
          WHERE LOWER(at.code) = ${dto.actorType!.toLowerCase()}
        `,
      },
      {
        key: 'link',
        enabled: !!dto.link,
        query: () =>
          Prisma.sql`
          SELECT DISTINCT a.id
          FROM public.applications a
          JOIN "ExternalRessource" er ON er."applicationId" = a.id
          WHERE LOWER(er.link) LIKE ${`%${dto.link!.toLowerCase()}%`}
        `,
      },
    ];

    const filteredIdsSets: string[][] = [];
    for (const filter of filters) {
      if (filter.enabled) {
        const result = await this.prisma.$queryRaw<Array<{ id: string }>>(
          filter.query(),
        );
        filteredIdsSets.push(result.map((r) => r.id));
      }
    }

    let finalIds: string[] | undefined = undefined;
    if (filteredIdsSets.length > 0) {
      finalIds = filteredIdsSets.reduce((a, b) =>
        a.filter((id) => b.includes(id)),
      );
      if (finalIds.length === 0) return { results: [], total: 0 };
    }

    const where: Prisma.ApplicationWhereInput = {
      ...(finalIds ? { id: { in: finalIds } } : {}),
      ...(shortName
        ? { shortName: { contains: shortName, mode: 'insensitive' } }
        : {}),
      ...(tag?.length ? { tags: { hasSome: upperCaseTags } } : {}),
      ...(priorityRestart?.length
        ? { priorityRestart: { in: priorityRestart } }
        : {}),
    };

    const total = await this.prisma.application.count({ where });

    if (sortBy === 'hostingSite') {
      const orderedIdsResult = await this.prisma.$queryRaw<
        Array<{ id: string }>
      >(
        Prisma.sql`
          SELECT a.id
          FROM public.applications a
          LEFT JOIN public."Hosting" h ON h."applicationId" = a.id
          LEFT JOIN public."HostingOption" ho ON h."hostingOptionId" = ho.id
          ${finalIds ? Prisma.sql`WHERE a.id IN (${Prisma.join(finalIds)})` : Prisma.empty}
          ORDER BY ho.site ${Prisma.raw(safeOrder)}
          OFFSET ${page * limit}
          LIMIT ${limit}
    `,
      );
      const orderedIds = orderedIdsResult.map((r) => r.id);

      const results = await this.prisma.application.findMany({
        where: { id: { in: orderedIds } },
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
            },
          },
        },
      });

      results.sort(
        (a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id),
      );

      return { results, total };
    }

    const sortableFields = ['shortName', 'priorityRestart'];
    const safeSortBy = sortableFields.includes(sortBy) ? sortBy : 'shortName';

    if (safeSortBy === 'shortName') {
      const orderedIdsResult = await this.prisma.$queryRaw<
        Array<{ id: string }>
      >(
        Prisma.sql`
          SELECT a.id
          FROM public.applications a
          ${finalIds ? Prisma.sql`WHERE a.id IN (${Prisma.join(finalIds)})` : Prisma.empty}
          ORDER BY COALESCE(a."shortName", a."label") ${Prisma.raw(safeOrder)}
          OFFSET ${page * limit}
          LIMIT ${limit}
        `,
      );
      const orderedIds = orderedIdsResult.map((r) => r.id);
      const results = await this.prisma.application.findMany({
        where,
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
            },
          },
        },
      });

      results.sort(
        (a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id),
      );
      return { results, total };
    }

    const results = await this.prisma.application.findMany({
      where,
      orderBy: {
        [safeSortBy]: safeOrder,
      },
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
          },
        },
      },
    });

    return { results, total };
  }

  async searchApplications(searchParams: SearchApplicationDto): Promise<any[]> {
    const {
      label,
      tag,
      priorityRestart,
      shortName,
      hostingSearch,
      page = 0,
      limit = 12,
    } = searchParams;

    const skip = page * limit;

    const conditions: Prisma.Sql[] = [
      ...buildLabelFilter(label),
      ...buildTagFilters(tag),
      ...buildPriorityFilter(priorityRestart),
      ...buildShortNameFilter(shortName),
      ...buildHostingSearchFilter(hostingSearch),
    ];

    const whereClause = conditions.length
      ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
      : Prisma.empty;

    const query = Prisma.sql`
  SELECT a.*,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'platform', ho.platform,
            'site', ho.site
          )
        )
        FROM "Hosting" host
        LEFT JOIN "HostingOption" ho ON host."hostingOptionId" = ho.id
        WHERE host."applicationId" = a.id
      ),
      '[]'::jsonb
    ) as hosting
  FROM public.applications a
  ${whereClause}
  LIMIT ${Prisma.raw(limit.toString())}
  OFFSET ${Prisma.raw(skip.toString())}
`;

    return this.prisma.$queryRaw(query);
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
        events: true,
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
        events: true,
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

  public async delete(id: string): Promise<void> {
    await this.prisma.application.delete({
      where: { id },
    });
  }
}
