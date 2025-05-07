import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { SearchApplicationDto } from '../application/dto/search-application.dto';
import { IApplicationSearchRepository } from './search.repository.interface';

@Injectable()
export class ApplicationSearchRepository
  implements IApplicationSearchRepository
{
  constructor(private prisma: PrismaService) {}

  async findApplicationsBySearch(
    dto: SearchApplicationDto,
  ): Promise<{ results: any[]; total: number }> {
    const {
      shortName,
      tag,
      priorityRestart,
      page = 0,
      limit = 15,
      sortBy = 'label',
      order = 'asc',
    } = dto;

    const safeOrder = order === 'desc' ? 'desc' : 'asc';

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
            WHERE (LOWER(l.value) LIKE ${`%${dto.label!.toLowerCase()}%`} OR LOWER(l.shortname) LIKE ${`%${dto.label!.toLowerCase()}%`})
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
              ${dto.hostingSite ? Prisma.sql`(LOWER(h.site) LIKE ${`%${dto.hostingSite?.toLowerCase() ?? ''}%`} OR LOWER(ho.site) LIKE ${`%${dto.hostingSite?.toLowerCase() ?? ''}%`})` : Prisma.sql`TRUE`}
              AND ${dto.hostingPlatform ? Prisma.sql`(LOWER(h.platform) LIKE ${`%${dto.hostingPlatform?.toLowerCase() ?? ''}%`} OR LOWER(ho.platform) LIKE ${`%${dto.hostingPlatform?.toLowerCase() ?? ''}%`})` : Prisma.sql`TRUE`}
              AND ${dto.hostingProvider ? Prisma.sql`(LOWER(h.provider) LIKE ${`%${dto.hostingProvider?.toLowerCase() ?? ''}%`} OR LOWER(ho.provider) LIKE ${`%${dto.hostingProvider?.toLowerCase() ?? ''}%`})` : Prisma.sql`TRUE`}
              AND ${dto.hostingBuilding ? Prisma.sql`LOWER(ho.building) LIKE ${`%${dto.hostingBuilding?.toLowerCase() ?? ''}%`}` : Prisma.sql`TRUE`}
              AND ${dto.hostingRoom ? Prisma.sql`LOWER(ho.room) LIKE ${`%${dto.hostingRoom?.toLowerCase() ?? ''}%`}` : Prisma.sql`TRUE`}
            )
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
      ...(tag?.length ? { tags: { hasSome: tag } } : {}),
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
          LEFT JOIN LATERAL (
            SELECT h.site
            FROM public."Hosting" h
            WHERE h."applicationId" = a.id
            ORDER BY h.site ASC
            LIMIT 1
          ) first_hosting ON true
          ${finalIds ? Prisma.sql`WHERE a.id IN (${Prisma.join(finalIds)})` : Prisma.empty}
          ORDER BY first_hosting.site ${Prisma.raw(safeOrder)}
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

    const sortableFields = ['label', 'shortName', 'priorityRestart'];
    const safeSortBy = sortableFields.includes(sortBy) ? sortBy : 'label';

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
}
