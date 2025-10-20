import { PrismaService } from "src/prisma/prisma.service";
import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
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
import { appConfig } from "src/config/configs";
import { ConfigType } from "@nestjs/config";

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
    @Inject(appConfig.KEY) private readonly appConf: ConfigType<typeof appConfig>,
  ) { }

  public async createApplication(
    requestorId: string,
    createApplicationDto: CreateApplicationDto,
  ) {
    const application = await this.applicationRepository.create(createApplicationDto);

    await this.updateApplicationQuality(application.id);

    for (const labelDto of createApplicationDto.labels || []) {
      await this.labelsService.create({
        source: labelDto.source,
        value: labelDto.value,
        metadatas: {
          create: {
            applicationId: application.id,
            createdById: requestorId,
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
    requestorId: string
  }): Promise<Application> {
    const { where, data, requestorId } = params;
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
        createdById: requestorId,
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
    const applications = await this.prisma.application.findMany({
      where: { status: { not: "deleted" } },
      select: {
        metadatas: {
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    });

    const months: string[] = [];
    for (let i = lastMonths - 1; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(month.toISOString().slice(0, 7));
    }

    return months.map((monthKey) => {
      const endOfMonth = new Date(`${monthKey}-01`);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      endOfMonth.setHours(23, 59, 59, 999);

      const total = applications.filter((app) => {
        const createdAt = app.metadatas[0]?.createdAt;
        return createdAt && new Date(createdAt) <= endOfMonth;
      }).length;

      return { month: monthKey, total };
    });
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
    if (searchParams.isActor && requestor) {
      return this.applicationRepository.findApplications(searchParams, { actorEmail: requestor.email });
    }
    if (!this.appConf.nonActorPermissions.includes("readBase") && requestor?.adminLevel < AdminLevel.READ) {
      return this.applicationRepository.findApplications(searchParams, { actorEmail: requestor.email });
    }
    return this.applicationRepository.findApplications(searchParams);
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

  public async deleteApplication(id: string): Promise<void> {
    const existing = await this.applicationRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Application non trouvée pour l'ID: ${id}`);
    }

    await this.applicationRepository.delete(id);
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
