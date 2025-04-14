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
    const filters = [
      {
        enabled: !!dto.label,
        query: Prisma.sql`
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
        enabled: !!dto.hostingSite || !!dto.hostingPlatform,
        query: Prisma.sql`
          SELECT DISTINCT a.id
          FROM public.applications a
          JOIN public."Hosting" h ON h."applicationId" = a.id
          WHERE ${Prisma.sql`LOWER(h.site) LIKE ${`%${dto.hostingSite?.toLowerCase() ?? ''}%`}`}
            AND ${Prisma.sql`LOWER(h.platform) LIKE ${`%${dto.hostingPlatform?.toLowerCase() ?? ''}%`}`}
        `,
      },
      {
        enabled: !!dto.organizationLabel,
        query: Prisma.sql`
          SELECT DISTINCT a.id
          FROM public.applications a
          JOIN public.actors act ON act."applicationId" = a.id
          JOIN public."Organization" org ON act."organizationId" = org.id
          WHERE LOWER(org.label) LIKE ${`%${dto.organizationLabel!.toLowerCase()}%`}
        `,
      },
      {
        enabled: !!dto.actorType,
        query: Prisma.sql`
          SELECT DISTINCT a.id
          FROM public.applications a
          JOIN public.actors act ON act."applicationId" = a.id
          JOIN public."actorTypes" at ON act."actorTypeId" = at.id 
          WHERE LOWER(at.code) = ${dto.actorType!.toLowerCase()}
        `,
      },
      {
        enabled: !!dto.link,
        query: Prisma.sql`
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
          filter.query,
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
    const safeOrder = order === 'desc' ? 'desc' : 'asc';
    const orderBy: Prisma.ApplicationOrderByWithRelationInput =
      sortBy === 'hostingSite'
        ? { label: safeOrder }
        : ({
            [sortBy]: safeOrder,
          } as Prisma.ApplicationOrderByWithRelationInput);

    const results = await this.prisma.application.findMany({
      where,
      orderBy,
      skip: page * limit,
      take: limit,
      include: {
        hostings: true,
        actors: {
          include: {
            organization: { select: { id: true, label: true } },
          },
        },
      },
    });

    return { results, total };
  }
}
