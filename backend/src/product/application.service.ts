import { PrismaService } from "src/prisma/prisma.service";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma, Application } from "@prisma/client";
import {
  CreateApplicationDto,
  PatchApplicationDto,
} from "./application/dto/create-application.dto";
import { ApplicationRepository } from "./infrastructure/repository/application.repository";
import { ApplicationSearchDto } from "./application/dto/search-application.dto";
import { LabelsService } from "src/labels/labels.service";
import { MetadataService } from "src/metadata/metadata.service";
import { calculateIQ } from "src/common/utils/quality.utils";
import { ApplicationRights } from "./application/dto/application-rights.dto";
import { AdminLevel, Requestor } from "src/user/entities/user.entity";
import { ApplicationSearchResultDto } from "./application/dto/get-application.dto.js";

export function objectEntries<Obj extends Record<string, unknown>>(
  obj: Obj,
): [keyof Obj, Obj[keyof Obj]][] {
  return Object.entries(obj) as [keyof Obj, Obj[keyof Obj]][];
}

@Injectable()
export class ApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly applicationRepository: ApplicationRepository,
    private readonly labelsService: LabelsService,
    private readonly metadataService: MetadataService,
  ) { }

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
    where: Prisma.ApplicationWhereUniqueInput
    data: PatchApplicationDto
    ownerId: string
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

      await this.metadataService.createMetadata({
        applicationId: updatedApplication.id,
        createdById: ownerId,
        title: "des informations générales",
        fields: {
          label: "libellé",
          shortName: "nom court",
          logo: "logo",
          status: "statut",
          description: "description",
          targetPopulations: "populations cibles",
          priorityRestart: "priorité de redémarrage",
          tags: "tags",
          purposes: "objectifs",
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
      Logger.error("Erreur pendant la mise à jour en tâche de fond", err);
    });
  }

  private async updateAllApplicationsQuality(): Promise<void> {
    const applications = await this.prisma.application.findMany();
    await Promise.all(
      applications.map(app => this.updateApplicationQuality(app.id)),
    );
    Logger.log(`${applications.length} applications mises à jour.`);
  }

  async countActiveApplications() {
    return await this.prisma.application.count({
      where: {
        NOT: { status: "deleted" },
      },
    });
  }

  getEmptyCountRange(n: number): Record<string, number> {
    const now = new Date();
    const range: Record<string, number> = {};
    for (let i = 0; i < n; i++) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      // use MM-YYYY format
      const monthKey = month.toISOString().slice(0, 7);
      range[monthKey] = 0; // Initialize with 0
    }
    return range;
  }

  async getApplicationsCountByMonth(lastMonths: number = 6): Promise<{ month: string, total: number }[]> {
    const now = new Date();
    const startDate = new Date(
      now.getFullYear(),
      now.getMonth() - lastMonths + 1,
      1,
    );

    const result = await this.prisma.application.findMany({
      where: {
        metadatas: {
          every: {
            createdAt: {
              gte: startDate,
            },
          },
        },
      },
      select: {
        metadatas: {
          orderBy: { createdAt: "asc" },
          take: 1, // Get the first metadata for each application
        },
      },
    });

    // reduce by month
    const monthMap: Record<string, number> = this.getEmptyCountRange(lastMonths);

    result.forEach((app) => {
      const createdAt = app.metadatas[0]?.createdAt;
      if (createdAt) {
        const monthKey = new Date(createdAt).toISOString().slice(0, 7);
        if (monthMap[monthKey] !== undefined) {
          monthMap[monthKey]++;
        }
      }
    });

    return Object.entries(monthMap).map(([month, total]) => ({
      month,
      total,
    })).reverse(); // Reverse to have the most recent month first
  }

  async getApplicationsCountByIq() {
    const result = await this.prisma.application.groupBy({
      by: ["quality"],
      _count: {
        _all: true,
      },
      where: {
        status: {
          not: "deleted",
        },
      },
      orderBy: {
        quality: "asc",
      },
    });

    return result.map(r => ({
      iq: r.quality,
      total: r._count._all,
    })).reverse();
  }

  public async getMyPerms(
    requestor: Requestor,
  ): Promise<ApplicationRights> {
    return requestor.appPerms;
  }

  public async search(
    searchParams: ApplicationSearchDto,
    requestor?: Requestor,
  ): Promise<ApplicationSearchResultDto> {
    if (requestor.adminLevel >= AdminLevel.READ) {
      // If the user has read or write permissions, proceed with the search
      return this.applicationRepository.findApplicationsBySearch(searchParams);
    }
    return this.applicationRepository.findApplicationsBySearch(searchParams, {
      actorEmail: requestor.email,
      ownerId: requestor.id,
    });
  }

  public async exportApplications(): Promise<any[]> {
    return this.applicationRepository.exportAllApplicationsFull();
  }

  public async getApplicationById(applicationId: string) {
    const application
      = await this.applicationRepository.findById(applicationId);

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
      where: { id: ownerId },
      select: { email: true, keycloakId: true },
    });

    if (!user) {
      throw new NotFoundException(`User not found for id=${ownerId}`);
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
      "label",
      "shortName",
      "description",
      "priorityRestart",
      "status",
    ] as const;
    const arrayFields = ["purposes", "targetPopulations", "tags"] as const;

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
