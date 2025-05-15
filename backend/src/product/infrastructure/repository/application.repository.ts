import { applicationMap } from '../../application/map/application.map';
import { IApplicationRepository } from './application.repository.interface';

import { Injectable } from '@nestjs/common';
import { CreateApplicationDto } from '../../application/dto/create-application.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

import { SearchApplicationDto } from './../../application/dto/search-application.dto';
import {
  buildLabelFilter,
  buildPriorityFilter,
  buildShortNameFilter,
  buildTagFilters,
} from './search.utils';
import { ApplicationWithAllRelations } from 'src/product/types/application.type';

@Injectable()
export class ApplicationRepository implements IApplicationRepository {
  constructor(private prisma: PrismaService) {}

  public async create(
    application: CreateApplicationDto,
    applicationMetadataId: string,
    ownerId: string,
  ) {
    const mappedData = applicationMap(
      application,
      applicationMetadataId,
      ownerId,
    );
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
      },
    });
  }

  async searchApplications(searchParams: SearchApplicationDto): Promise<any[]> {
    const {
      label,
      tag,
      priorityRestart,
      shortName,
      page = 0,
      limit = 12,
    } = searchParams;

    const skip = page * limit;

    const conditions: Prisma.Sql[] = [
      ...buildLabelFilter(label),
      ...buildTagFilters(tag),
      ...buildPriorityFilter(priorityRestart),
      ...buildShortNameFilter(shortName),
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
        metadata: true,
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
        metadata: true,
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
