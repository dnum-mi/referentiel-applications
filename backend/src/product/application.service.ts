import { PrismaService } from 'src/prisma/prisma.service';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, Application } from '@prisma/client';
import {
  CreateApplicationDto,
  PatchApplicationDto,
} from './application/dto/create-application.dto';
import { ApplicationRepository } from './infrastructure/repository/application.repository';
import { ApplicationSearchDto } from './application/dto/search-application.dto';
import { LabelsService } from 'src/labels/labels.service';
import { MetadatasService } from 'src/metadatas/metadatas.service';
import { calculateIQ } from 'src/common/utils/quality.utils';
import { ApplicationRights } from './application/dto/application-rights.dto';
import { APP_PERMISSIONS } from 'src/common/utils/types';
import { AdminLevel, UserEntity } from 'src/user/entities/user.entity';

export function objectEntries<Obj extends Record<string, unknown>>(
  obj: Obj,
): [keyof Obj, Obj[keyof Obj]][] {
  return Object.entries(obj) as [keyof Obj, Obj[keyof Obj]][];
}

@Injectable()
export class ApplicationService {
  constructor(
    private prisma: PrismaService,
    private applicationRepository: ApplicationRepository,
    private readonly labelsService: LabelsService,
    private readonly metadatasService: MetadatasService,
  ) {}

  public async createApplication(
    ownerId: string,
    createApplicationDto: CreateApplicationDto,
  ) {
    const application = await this.persistApplication(
      ownerId,
      createApplicationDto,
    );

    await this.updateApplicationQuality(application.id);

    for (const labelDto of createApplicationDto.labels || []) {
      await this.labelsService.create({
        source: labelDto.source,
        value: labelDto.value,
        metadatas: {
          create: {
            applicationId: application.id,
            createdById: ownerId,
            description: `Ajout du libellé alternatif "${labelDto.value}" à l'application`,
          },
        },
        application: {
          connect: {
            id: application.id,
          },
        },
      });
    }
    return application;
  }

  public async update(params: {
    where: Prisma.ApplicationWhereUniqueInput;
    data: PatchApplicationDto;
    ownerId: string;
  }): Promise<Application> {
    const { where, data, ownerId } = params;
    const applicationUpdates: Prisma.ApplicationUpdateInput = {};

    this.applyScalarAndSimpleRelationUpdates(data, applicationUpdates);

    try {
      const oldApp = await this.applicationRepository.findById(where.id);

      const updatedApplication = await this.prisma.application.update({
        where,
        data: applicationUpdates,
      });

      await this.updateApplicationQuality(updatedApplication.id);

      await this.metadatasService.createMetadata({
        applicationId: updatedApplication.id,
        createdById: ownerId,
        title: `des informations générales`,
        fields: {
          label: 'libellé',
          shortName: 'nom court',
          logo: 'logo',
          status: 'statut',
          description: 'description',
          targetPopulations: 'populations cibles',
          priorityRestart: 'priorité de redémarrage',
          tags: 'tags',
          purposes: 'objectifs',
        },
        oldData: oldApp,
        newData: updatedApplication,
      });

      return updatedApplication;
    } catch {
      throw new NotFoundException(
        `Application non trouvée pour l'ID: ${where.id}`,
      );
    }
  }

  public updateAllApplicationsQualityInBackground(): void {
    this.updateAllApplicationsQuality().catch((err) => {
      Logger.error('Erreur pendant la mise à jour en tâche de fond', err);
    });
  }

  private async updateAllApplicationsQuality(): Promise<void> {
    const applications = await this.prisma.application.findMany();
    await Promise.all(
      applications.map((app) => this.updateApplicationQuality(app.id)),
    );
    Logger.log(`${applications.length} applications mises à jour.`);
  }

  async countActiveApplications() {
    return await this.prisma.application.count({
      where: {
        NOT: { status: 'deleted' },
      },
    });
  }

  async getApplicationsCountByMonth(lastMonths: number = 6) {
    const now = new Date();
    const startDate = new Date(
      now.getFullYear(),
      now.getMonth() - lastMonths + 1,
      1,
    );

    const result = await this.prisma.$queryRaw<
      { month: Date; total: number }[]
    >`
    WITH first_metadata AS (
      SELECT DISTINCT ON (m."applicationId")
        m."applicationId",
        m."createdAt"
      FROM "metadata" m
      ORDER BY m."applicationId", m."createdAt" ASC
    ),

    filtered_apps AS (
      SELECT
        fm."applicationId",
        fm."createdAt"
      FROM first_metadata fm
      JOIN "applications" a ON a.id = fm."applicationId"
      WHERE a.status IS DISTINCT FROM 'deleted'
    ),

    months AS (
      SELECT generate_series(
        DATE_TRUNC('month', ${startDate}::timestamp),
        DATE_TRUNC('month', NOW()),
        INTERVAL '1 month'
      ) AS month_start
    )

    SELECT
      months.month_start AS month,
      COUNT(fa."applicationId") AS total
    FROM months
    LEFT JOIN filtered_apps fa
      ON fa."createdAt" <= months.month_start + INTERVAL '1 month' - INTERVAL '1 second'
    GROUP BY months.month_start
    ORDER BY months.month_start ASC;
  `;

    return result.map((r) => ({
      month: r.month,
      total: Number(r.total),
    }));
  }

  async getApplicationsCountByIq() {
    const result = await this.prisma.application.groupBy({
      by: ['quality'],
      _count: {
        _all: true,
      },
      where: {
        status: {
          not: 'deleted',
        },
      },
      orderBy: {
        quality: 'asc',
      },
    });

    return result.map((r) => ({
      iq: r.quality,
      total: r._count._all,
    }));
  }

  public async getSortedMetadatas(
    applicationId: string,
    offset = 0,
    limit = 1,
    order: 'asc' | 'desc' = 'asc',
  ) {
    return this.prisma.metadata.findMany({
      where: { applicationId },
      orderBy: { createdAt: order },
      skip: offset,
      take: limit,
      include: {
        createdBy: true,
      },
    });
  }

  public async getMyPerms(
    applicationId: string,
    email: string,
  ): Promise<ApplicationRights> {
    const userActors = await this.prisma.actor.findMany({
      where: { applicationId, email },
      select: {
        actorType: {
          select: {
            appPermissions: {
              omit: {
                actorTypeId: true,
              },
            },
          },
        },
      },
      distinct: ['actorTypeId'],
    });
    const perms = new Set<APP_PERMISSIONS>();
    for (const actor of userActors) {
      for (const actorPerms of actor.actorType.appPermissions) {
        for (const [permName, value] of objectEntries(actorPerms)) {
          if (value === true) {
            perms.add(permName);
          }
        }
      }
    }
    return Array.from(perms.values());
  }

  public async search(
    searchParams: ApplicationSearchDto,
    user?: UserEntity,
  ): Promise<{ results: any[]; total: number } | any[]> {
    // Handle link-specific search (old SearchApplicationDto behavior)
    if ('link' in searchParams && searchParams.link) {
      const results = await this.applicationRepository.findByLink(
        searchParams.link,
      );
      return Array.isArray(results) ? results : [results];
    }
    if (user.adminLevel >= AdminLevel.READ) {
      // If the user has read or write permissions, proceed with the search
      return this.applicationRepository.findApplicationsBySearch(searchParams);
    }
    return this.applicationRepository.findApplicationsBySearch(searchParams, {
      actorEmail: user.email,
      ownerId: user.keycloakId,
    });
  }

  public async exportApplications(): Promise<any[]> {
    return this.applicationRepository.exportAllApplicationsFull();
  }

  public async getApplicationById(applicationId: string) {
    const application =
      await this.applicationRepository.findById(applicationId);

    if (!application) {
      throw new NotFoundException(
        `Application non trouvée pour l'ID: ${applicationId}`,
      );
    }

    return application;
  }

  public async getApplications() {
    const applications = await this.applicationRepository.findAll();
    return applications;
  }

  public async deleteApplication(id: string): Promise<void> {
    const existing = await this.applicationRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Application non trouvée pour l'ID: ${id}`);
    }

    await this.applicationRepository.delete(id);
  }

  private async persistApplication(ownerId: string, createApplicationDto) {
    const user = await this.prisma.user.findUnique({
      where: { keycloakId: ownerId },
      select: { email: true, keycloakId: true },
    });

    if (!user) {
      throw new NotFoundException(`User not found for keycloakId=${ownerId}`);
    }

    const application = this.applicationRepository.create(
      createApplicationDto,
      ownerId,
    );

    return application;
  }

  private applyScalarAndSimpleRelationUpdates(
    data: PatchApplicationDto,
    applicationUpdates: Prisma.ApplicationUpdateInput,
  ): void {
    const scalarFields = [
      'label',
      'shortName',
      'description',
      'priorityRestart',
      'status',
    ] as const;
    const arrayFields = ['purposes', 'targetPopulations', 'tags'] as const;

    scalarFields.forEach((field) => {
      if (data[field] !== undefined) {
        applicationUpdates[field] = data[field];
      }
    });

    arrayFields.forEach((field) => {
      if (data[field] !== undefined) {
        applicationUpdates[field] = { set: data[field] };
      }
    });
  }
  async updateApplicationQuality(applicationId: string) {
    const iq = await calculateIQ(applicationId, this.prisma);
    return await this.prisma.application.update({
      where: { id: applicationId },
      data: { quality: iq },
    });
  }
}
