import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { Application, Prisma } from "@prisma/client";
import { calculateIQ } from "src/common/utils/quality.utils";
import { appConfig } from "src/config/configs";
import { LabelsService } from "src/labels/labels.service";
import { MetadatasService } from "src/metadatas/metadatas.service";
import { PrismaService } from "src/prisma/prisma.service";
import { TagsService } from "src/tag/tags.service";
import { AdminLevel, Requestor } from "src/user/entities/user.entity";
import { ApplicationRights } from "./dto/application-rights.dto";
import {
  CreateApplicationDto,
  PatchApplicationDto,
} from "./dto/create-application.dto";
import { ApplicationSearchResultDto } from "./dto/get-application.dto";
import { ApplicationSearchDto } from "./dto/search-application.dto";
import { TechnicalDebtPointDto } from "./dto/technical-debt-point.dto";
import { ApplicationRepository } from "./infrastructure/repository/application.repository";
import { ApplicationViewService } from "./view.service";
import { PrismaQueryBuilder } from "src/applications/prisma-query-builder.service";
import { BusinessDivisionService } from "src/business-division/business-division.service";

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
    private readonly tagsService: TagsService,
    private readonly labelsService: LabelsService,
    private readonly metadataService: MetadatasService,
    private readonly applicationViewService: ApplicationViewService,
    private readonly prismaQueryBuilder: PrismaQueryBuilder,
    private readonly businessDivisionService: BusinessDivisionService,
    @Inject(appConfig.KEY)
    private readonly appConf: ConfigType<typeof appConfig>,
  ) {}

  public async createApplication(
    requestorId: string,
    createApplicationDto: CreateApplicationDto,
  ) {
    const existingTags = await this.tagsService.findByNames(
      createApplicationDto.tags,
    );

    const application = await this.prisma.$transaction(async (tx) => {
      const app = await tx.application.create({
        data: {
          label: createApplicationDto.label,
          shortName: createApplicationDto.shortName ?? null,
          logo: createApplicationDto.logo ?? null,
          description: createApplicationDto.description,
          targetPopulations: createApplicationDto.targetPopulations ?? [],
          purposes: createApplicationDto.purposes ?? [],
          type: createApplicationDto.type ?? null,
          tags: {
            connect: existingTags,
          },
          priorityRestart: createApplicationDto.priorityRestart ?? null,
          quality: 0,
        },
      });

      const status = await tx.applicationStatus.create({
        data: {
          status: createApplicationDto.status.status,
          applicationId: app.id,
        },
      });

      await tx.application.update({
        where: { id: app.id },
        data: { currentStatusId: status.id },
      });

      return app;
    });

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
    where: Prisma.ApplicationWhereUniqueInput;
    data: PatchApplicationDto;
    requestor: Requestor;
  }): Promise<Application> {
    const { where, requestor } = params;
    let { data } = params;

    // protect fields based on permissions
    // priorityRestart field is only writable by users with writePriorityRestart permission
    if (!requestor.appPerms.includes("writePriorityRestart")) {
      delete data.priorityRestart;
      // if the user has writeBase permission, they can write other fields except priorityRestart
    } else if (!requestor.appPerms.includes("writeBase")) {
      data = {
        priorityRestart: data.priorityRestart,
      };
    }

    const applicationUpdates = this.applyScalarAndSimpleRelationUpdates(data);

    if (data.tags) {
      const existingTags = await this.tagsService.findByNames(data.tags);
      applicationUpdates.tags = { set: existingTags };
    }

    if (data.businessDivisionId !== undefined) {
      if (data.businessDivisionId) {
        await this.businessDivisionService.findById(data.businessDivisionId);
        applicationUpdates.businessDivision = {
          connect: { id: data.businessDivisionId },
        };
      } else {
        applicationUpdates.businessDivision = { disconnect: true };
      }
    }

    try {
      const oldApp = await this.applicationRepository.findById(where.id);

      const updatedApplication = await this.prisma.application.update({
        where,
        data: applicationUpdates,
        include: { tags: true, businessDivision: true },
      });

      await this.updateApplicationQuality(updatedApplication.id);

      await this.metadataService.createMetadata({
        applicationId: updatedApplication.id,
        createdById: requestor.id,
        title: "des informations générales",
        fields: {
          label: "libellé",
          shortName: "nom court",
          logo: "logo",
          description: "description",
          targetPopulations: "populations cibles",
          priorityRestart: "priorité de redémarrage",
          tags: "tags",
          purposes: "objectifs",
          type: "type d'application",
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
      applications.map((app) => this.updateApplicationQuality(app.id)),
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

  async getApplicationsCountByMonth(
    lastMonths: number = 6,
  ): Promise<{ month: string; total: number }[]> {
    const now = new Date();
    const applications = await this.prisma.application.findMany({
      where: {
        currentStatus: {
          status: { not: "deleted" },
        },
      },
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
      where: {
        currentStatus: {
          status: { not: "deleted" },
        },
      },
      _count: { _all: true },
    });

    return result
      .map((group) => ({
        iq: group.quality,
        total: group._count._all,
      }))
      .sort((a, b) => b.iq - a.iq);
  }

  public async getMyPerms(requestor: Requestor): Promise<ApplicationRights> {
    return requestor.appPerms;
  }

  public async search(
    searchParams: ApplicationSearchDto,
    requestor?: Requestor,
  ): Promise<ApplicationSearchResultDto> {
    let paginatedResult: ApplicationSearchResultDto;
    const { sortBy = "shortName", order = "asc" } = searchParams;
    const orderBy = this.prismaQueryBuilder.buildOrderBy(sortBy, order);

    if (searchParams.isActor && requestor) {
      const where = this.prismaQueryBuilder.buildSearchWhere(searchParams, {
        actorEmail: requestor.email,
      });
      paginatedResult = await this.applicationRepository.findApplications(
        searchParams,
        where,
        orderBy,
      );
    }
    if (
      !this.appConf.nonActorPermissions.includes("readBase") &&
      requestor?.adminLevel < AdminLevel.READ
    ) {
      const where = this.prismaQueryBuilder.buildSearchWhere(searchParams, {
        actorEmail: requestor.email,
      });
      paginatedResult = await this.applicationRepository.findApplications(
        searchParams,
        where,
        orderBy,
      );
    }
    const where = this.prismaQueryBuilder.buildSearchWhere(searchParams);
    paginatedResult = await this.applicationRepository.findApplications(
      searchParams,
      where,
      orderBy,
    );

    const dataWithViews = paginatedResult.results.map((app: any) => {
      const { _count, ...rest } = app;

      return {
        ...rest,
        applicationViews: _count?.applicationViews ?? 0,
      };
    });

    return {
      ...paginatedResult,
      results: dataWithViews,
    };
  }

  public async getTechnicalDebtPoints(
    searchParams: ApplicationSearchDto,
    requestor?: Requestor,
  ): Promise<TechnicalDebtPointDto[]> {
    const { sortBy = "shortName", order = "asc" } = searchParams;
    const orderBy = this.prismaQueryBuilder.buildOrderBy(sortBy, order);

    if (searchParams.isActor && requestor) {
      const where = this.prismaQueryBuilder.buildSearchWhere(searchParams, {
        actorEmail: requestor.email,
      });
      const whereBuildTechnicalDebtInfo =
        this.prismaQueryBuilder.buildTechnicalDebtInfo();
      where.AND.push(whereBuildTechnicalDebtInfo);
      return this.applicationRepository.findTechnicalDebtPoints(where, orderBy);
    }
    if (
      !this.appConf.nonActorPermissions.includes("readBase") &&
      requestor?.adminLevel < AdminLevel.READ
    ) {
      const where = this.prismaQueryBuilder.buildSearchWhere(searchParams, {
        actorEmail: requestor.email,
      });
      const whereBuildTechnicalDebtInfo =
        this.prismaQueryBuilder.buildTechnicalDebtInfo();
      where.AND.push(whereBuildTechnicalDebtInfo);
      return this.applicationRepository.findTechnicalDebtPoints(where, orderBy);
    }
    const where = this.prismaQueryBuilder.buildSearchWhere(searchParams);
    const whereBuildTechnicalDebtInfo =
      this.prismaQueryBuilder.buildTechnicalDebtInfo();
    where.AND.push(whereBuildTechnicalDebtInfo);
    return this.applicationRepository.findTechnicalDebtPoints(where, orderBy);
  }

  public async exportApplications(): Promise<any[]> {
    return this.applicationRepository.findAllWithFullRelations();
  }

  public async getApplicationById(applicationId: string, user?: Requestor) {
    const application =
      await this.applicationRepository.findById(applicationId);

    if (!application) {
      throw new NotFoundException(
        `Application non trouvée pour l'ID: ${applicationId}`,
      );
    }

    if (user)
      await this.applicationViewService.createView(applicationId, user.id);

    const views = await this.applicationViewService.getView(applicationId);
    return {
      ...application,
      tags: application.tags.map((tag) => tag.name),
      views,
    };
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
  ): Prisma.ApplicationUpdateInput {
    const applicationUpdates: Prisma.ApplicationUpdateInput = {};
    const scalarFields = [
      "label",
      "shortName",
      "description",
      "priorityRestart",
      "type",
    ] as const;
    const arrayFields = ["purposes", "targetPopulations"] as const;

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
    return applicationUpdates;
  }

  async updateApplicationQuality(applicationId: string) {
    const iq = await calculateIQ(applicationId, this.prisma);
    return await this.prisma.application.update({
      where: { id: applicationId },
      data: { quality: iq },
    });
  }
}
