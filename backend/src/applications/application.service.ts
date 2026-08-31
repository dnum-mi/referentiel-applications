import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import {
  Application,
  Permission,
  Prisma,
  QualityCampaignStatus,
  Status,
} from "@prisma/client";
import { PrismaQueryBuilder } from "src/applications/prisma-query-builder.service";
import { CheckPermissions } from "src/common/service/check-permissions.service";
import {
  isDimaFilled,
  isPdmaFilled,
} from "src/common/utils/compliance-presence.utils";
import { calculateIQ } from "src/common/utils/quality.utils";
import {
  getCompletedQualityActionKeys,
  getQualityActionLabel,
} from "src/common/utils/quality-actions.utils";
import { MetadatasService } from "src/metadatas/metadatas.service";
import { PrismaService } from "src/prisma/prisma.service";
import { TagsService } from "src/tag/tags.service";
import { Requestor } from "src/user/entities/user.entity";
import { ApplicationRights } from "./dto/application-rights.dto";
import {
  CreateApplicationDto,
  PatchApplicationDto,
} from "./dto/create-application.dto";
import {
  ApplicationDto,
  ApplicationSearchResultDto,
  QualityCampaignActionDto,
  QualitySummaryDto,
} from "./dto/get-application.dto";
import { ApplicationWithAllRelations } from "src/applications/types/application.type";
import { ApplicationSearchDto } from "./dto/search-application.dto";
import { TechnicalDebtPointDto } from "./dto/technical-debt-point.dto";
import { StatusesService } from "src/statuses/statuses.service";
import { ApplicationRepository } from "./infrastructure/repository/application.repository";
import { ApplicationSearchService } from "./search/application-search.service";
import { ApplicationViewService } from "./view.service";

export function objectEntries<Obj extends Record<string, unknown>>(
  obj: Obj,
): [keyof Obj, Obj[keyof Obj]][] {
  return Object.entries(obj) as [keyof Obj, Obj[keyof Obj]][];
}

// Code du type d'acteur système "Créateur", assigné automatiquement à l'utilisateur qui crée une
// application (cf. createApplication). Créé par la migration 20260814090000_add_createur_actor_type.
const CREATOR_ACTOR_TYPE_CODE = "CREATEUR";

// Sous-ensemble minimal du client Prisma transactionnel utilisé par assignCreatorActor : les
// types générés du client étendu (PrismaService) et du client `tx` ne sont pas mutuellement
// assignables à cause des extensions ($extends), d'où ce typage structurel (cf. CurrentStatusClient
// dans statuses.service.ts, même contrainte).
interface AssignCreatorActorClient {
  user: {
    findUnique(args: {
      where: { id: string };
    }): Promise<{ email: string; organizationId: string | null } | null>;
  };
  actorType: {
    findFirst(args: { where: { code: string } }): Promise<{
      id: string;
    } | null>;
  };
  actor: {
    create(args: {
      data: {
        email: string;
        organizationId: string | null;
        applicationId: string;
        actorTypeId: string;
        isGroup: boolean;
      };
    }): Promise<{ id: string; email: string | null }>;
  };
}

@Injectable()
export class ApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly applicationRepository: ApplicationRepository,
    private readonly tagsService: TagsService,
    private readonly metadataService: MetadatasService,
    private readonly applicationViewService: ApplicationViewService,
    private readonly prismaQueryBuilder: PrismaQueryBuilder,
    private readonly checkPermissions: CheckPermissions,
    private readonly applicationSearchService: ApplicationSearchService,
    private readonly statusesService: StatusesService,
  ) {}

  public async createApplication(
    requestorId: string,
    createApplicationDto: CreateApplicationDto,
  ) {
    const existingTags = await this.tagsService.findByNames(
      createApplicationDto.tags,
    );

    const { application, creatorActor } = await this.prisma.$transaction(
      async (tx) => {
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
            businessDivisions: {
              connect: (createApplicationDto.businessDivisionIds ?? []).map(
                (id) => ({ id }),
              ),
            },
          },
        });

        await tx.applicationStatus.create({
          data: {
            status: createApplicationDto.status.status,
            applicationId: app.id,
          },
        });

        // La règle « statut courant = plus récent » vit dans StatusesService (#2250) ;
        // on lui passe la transaction pour rester atomique.
        await this.statusesService.updateCurrentStatus(app.id, tx);

        const creatorActor = await this.assignCreatorActor(
          tx,
          app.id,
          requestorId,
        );

        return { application: app, creatorActor };
      },
    );

    await this.updateApplicationQuality(application.id);
    await this.metadataService.createMetadata({
      applicationId: application.id,
      createdById: requestorId,
      title: `de l'application`,
      type: "add",
    });
    if (creatorActor) {
      await this.metadataService.createMetadata({
        applicationId: application.id,
        createdById: requestorId,
        title: `de l'acteur : ${CREATOR_ACTOR_TYPE_CODE} : ${creatorActor.email}`,
        type: "add",
        entity: "actorId",
        entityId: creatorActor.id,
      });
    }
    this.applicationSearchService.scheduleRefresh();
    return application;
  }

  // Assigne automatiquement le créateur de l'application comme acteur de type "Créateur"
  // (cf. CREATOR_ACTOR_TYPE_CODE), pour qu'il ait immédiatement les droits associés sans
  // intervention manuelle. Exécuté dans la même transaction que la création de l'application.
  private async assignCreatorActor(
    tx: AssignCreatorActorClient,
    applicationId: string,
    requestorId: string,
  ) {
    const [requestor, creatorActorType] = await Promise.all([
      tx.user.findUnique({ where: { id: requestorId } }),
      tx.actorType.findFirst({ where: { code: CREATOR_ACTOR_TYPE_CODE } }),
    ]);

    if (!requestor || !creatorActorType) return null;

    return tx.actor.create({
      data: {
        email: requestor.email,
        organizationId: requestor.organizationId,
        applicationId,
        actorTypeId: creatorActorType.id,
        isGroup: false,
      },
    });
  }

  public async update(params: {
    applicationId: string;
    data: PatchApplicationDto;
    requestor: Requestor;
  }): Promise<Application> {
    const { applicationId, requestor } = params;
    let { data } = params;

    // protect fields based on permissions
    // priorityRestart field is only writable by users with AppWritePriority permission
    if (
      !(await this.checkPermissions.can(
        [Permission.AppWritePriority],
        requestor,
      ))
    ) {
      delete data.priorityRestart;
      // if the user has AppWrite permission, they can write other fields except priorityRestart
    } else if (
      !(await this.checkPermissions.can([Permission.AppWrite], requestor))
    ) {
      data = {
        priorityRestart: data.priorityRestart,
      };
    }

    const applicationUpdates = this.applyScalarAndSimpleRelationUpdates(data);

    if (data.tags) {
      const existingTags = await this.tagsService.findByNames(data.tags);
      applicationUpdates.tags = { set: existingTags };
    }

    if (data.businessDivisionIds !== undefined) {
      applicationUpdates.businessDivisions = {
        set: data.businessDivisionIds.map((id) => ({ id })),
      };
    }

    try {
      const oldApp = await this.applicationRepository.findById(applicationId);

      const updatedApplication = await this.prisma.application.update({
        where: { id: applicationId },
        data: applicationUpdates,
        include: { tags: true, businessDivisions: true },
      });

      await this.updateApplicationQuality(updatedApplication.id);
      await this.recordQualityCampaignActions(
        updatedApplication.id,
        requestor.id,
      );

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

      this.applicationSearchService.scheduleRefresh();
      return updatedApplication;
    } catch {
      throw new NotFoundException(
        `Application non trouvée pour l'ID: ${applicationId}`,
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
        quality: { not: null },
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
    const fullText = searchParams.q?.trim();
    const prefixText = searchParams.qPrefix?.trim();
    // `qPrefix` (autocomplétion au fil de la frappe) est prioritaire sur `q`.
    const hasFullText = !!(prefixText || fullText);
    // Avec une recherche full-text, le tri par défaut est la pertinence ;
    // sinon on conserve le tri historique (shortName).
    const { order = "asc" } = searchParams;
    const sortBy =
      searchParams.sortBy ?? (hasFullText ? "relevance" : "shortName");
    const orderBy = this.prismaQueryBuilder.buildOrderBy(sortBy, order);

    const [hasAppList, hasAppRead] = await Promise.all([
      this.checkPermissions.can([Permission.AppList], requestor),
      this.checkPermissions.can([Permission.AppRead], requestor),
    ]);

    if (!hasAppList && !hasAppRead) {
      return { results: [], total: 0, averageIq: 0, technicalDebtPoints: [] };
    }

    // La recherche full-text est indépendante de la construction des filtres
    // structurels : les deux sont lancées en parallèle.
    const rankedPromise: Promise<string[] | undefined> = !hasFullText
      ? Promise.resolve(undefined)
      : (prefixText
          ? this.applicationSearchService.fullTextSearchPrefix(prefixText)
          : this.applicationSearchService.fullTextSearch(fullText as string)
        ).then((ranked) => ranked.map((result) => result.id));

    const [where, rankedIds] = await Promise.all([
      this.prismaQueryBuilder.buildSearchWhere(
        searchParams,
        requestor,
        hasAppList
          ? undefined
          : {
              actorEmail: requestor?.email,
              businessDivisionId: requestor?.organization?.businessDivisionId,
            },
      ),
      rankedPromise,
    ]);

    if (searchParams.millesime != null) {
      where.AND.push(
        this.prismaQueryBuilder.buildTechnicalDebtInfo(searchParams.millesime),
      );
    }

    // Recherche full-text : on restreint l'ensemble aux applications retournées
    // par le moteur de recherche, en conservant leur ordre de pertinence.
    if (rankedIds) {
      where.AND.push({ id: { in: rankedIds } });
    }

    const useRelevance = hasFullText && sortBy === "relevance";
    const useRawSort =
      !useRelevance && this.prismaQueryBuilder.isRawSort(sortBy);

    let paginatedResult: ApplicationSearchResultDto;

    if (useRelevance || useRawSort) {
      // Une seule passe filtrée donne les ids retenus, le total et l'IQ moyen ;
      // seules les fiches de la page demandée sont ensuite chargées.
      const matching =
        await this.applicationRepository.findMatchingApplications(where);
      const total = matching.length;
      const qualities = matching
        .map((app) => app.quality)
        .filter((quality): quality is number => quality !== null);
      const averageIq = qualities.length
        ? qualities.reduce((sum, quality) => sum + quality, 0) /
          qualities.length
        : 0;

      let orderedIds: string[];
      if (useRelevance) {
        // Conserver l'ordre de pertinence renvoyé par le moteur de recherche.
        const matchingSet = new Set(matching.map((app) => app.id));
        orderedIds = (rankedIds ?? []).filter((id) => matchingSet.has(id));
      } else {
        orderedIds = await this.prismaQueryBuilder.sortApplicationIdsRaw(
          matching.map((app) => app.id),
          sortBy,
          order,
        );
      }

      const results = await this.applicationRepository.findApplicationsPage(
        searchParams,
        orderedIds,
      );
      paginatedResult = {
        results,
        total,
        averageIq,
      } as ApplicationSearchResultDto;
    } else {
      paginatedResult = await this.applicationRepository.findApplications(
        searchParams,
        where,
        orderBy,
      );
    }

    const dataWithViews = paginatedResult.results.map(
      (app: ApplicationDto & { _count?: { applicationViews: number } }) => {
        const { _count, ...rest } = app;

        return {
          ...rest,
          applicationViews: _count?.applicationViews ?? 0,
        };
      },
    );

    return {
      ...paginatedResult,
      results: dataWithViews,
      technicalDebtPoints: dataWithViews.filter((d) => {
        const t = d.technicalDebtInfo;
        return (
          t != null &&
          t.technicalMaturity != null &&
          t.businessMaturity != null &&
          t.costContainment != null
        );
      }),
    };
  }

  public async getTechnicalDebtPoints(
    searchParams: ApplicationSearchDto,
    requestor?: Requestor,
  ): Promise<TechnicalDebtPointDto[]> {
    const { sortBy = "shortName", order = "asc" } = searchParams;
    const orderBy = this.prismaQueryBuilder.buildOrderBy(sortBy, order);

    // Par défaut, on présente le millésime de campagne le plus récent disponible.
    const millesime =
      searchParams.millesime ??
      (await this.applicationRepository.findLatestMillesime()) ??
      undefined;

    const hasMDITList = await this.checkPermissions.can(
      [Permission.MDITList],
      requestor,
    );
    if (hasMDITList) {
      const where = await this.prismaQueryBuilder.buildSearchWhere(
        searchParams,
        requestor,
      );
      where.AND.push(this.prismaQueryBuilder.buildTechnicalDebtInfo(millesime));
      return this.applicationRepository.findTechnicalDebtPoints(
        where,
        orderBy,
        millesime,
      );
    }

    const hasAppRead = await this.checkPermissions.can(
      [Permission.AppRead],
      requestor,
    );

    if (hasAppRead) {
      const where = await this.prismaQueryBuilder.buildSearchWhere(
        searchParams,
        requestor,
        {
          actorEmail: requestor?.email,
          businessDivisionId: requestor?.organization?.businessDivisionId,
        },
      );
      where.AND.push(this.prismaQueryBuilder.buildTechnicalDebtInfo(millesime));
      return this.applicationRepository.findTechnicalDebtPoints(
        where,
        orderBy,
        millesime,
      );
    }

    return [];
  }

  public async getTechnicalDebtMillesimes(): Promise<number[]> {
    return this.applicationRepository.findDistinctMillesimes();
  }

  public async exportApplications(): Promise<ApplicationWithAllRelations[]> {
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
    this.applicationSearchService.scheduleRefresh();
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
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { currentStatus: true },
    });

    const currentStatus = application?.currentStatus?.status;
    const isExcludedFromQuality =
      currentStatus === Status.decommissioned ||
      currentStatus === Status.deleted;

    const iq = isExcludedFromQuality
      ? null
      : await calculateIQ(applicationId, this.prisma);

    return await this.prisma.application.update({
      where: { id: applicationId },
      data: { quality: iq },
    });
  }

  async getQualitySummary(applicationId: string): Promise<QualitySummaryDto> {
    const [application, hosting, actors, compliance, links, rgaaCompliances] =
      await Promise.all([
        this.prisma.application.findUnique({ where: { id: applicationId } }),
        this.prisma.hosting.findFirst({ where: { applicationId } }),
        this.prisma.actor.findMany({
          where: { applicationId },
          include: { actorType: true },
        }),
        this.prisma.compliance.findFirst({ where: { applicationId } }),
        this.prisma.externalRessource.findMany({ where: { applicationId } }),
        this.prisma.rgaaCompliance.findMany({ where: { applicationId } }),
      ]);

    return {
      hasDescription: Boolean(application?.description),
      hasHosting: Boolean(hosting),
      hasSnapvisu: links.some((l) => l.link.toLowerCase().includes("snapvisu")),
      actors: {
        MOA: actors.some((a) => a.actorType?.code === "MOA"),
        MOE: actors.some((a) => a.actorType?.code === "MOE"),
        TMA: actors.some((a) => a.actorType?.code === "TMA"),
        HEB: actors.some((a) => a.actorType?.code === "HEB"),
        REP: actors.some((a) => a.actorType?.code === "REP"),
      },
      compliances: {
        DIMA: isDimaFilled(compliance),
        PDMA: isPdmaFilled(compliance),
        HOMOLOGATION: Boolean(compliance?.homologation_date_end),
        RGAA: rgaaCompliances.length > 0,
        DSFR: compliance?.dsfr_implemented ?? null,
        RGPD: compliance?.rgpd_has_aipd ?? null,
      },
    };
  }

  /**
   * Constate les actions de mise en qualité (acteurs/conformités renseignés) complétées sur
   * cette application pendant qu'une campagne qualité la ciblant est en cours, pour les afficher
   * en temps réel dans l'onglet Qualité et les reprendre dans le mail de rapport sponsor (#2282
   * amélioration). Best-effort : ne doit jamais faire échouer l'écriture qui l'a déclenché.
   */
  async recordQualityCampaignActions(applicationId: string, userId?: string) {
    try {
      const activeTargets = await this.prisma.qualityCampaignTarget.findMany({
        where: {
          applicationId,
          campaign: { status: QualityCampaignStatus.in_progress },
        },
        select: { campaignId: true },
      });
      if (activeTargets.length === 0) return;

      const summary = await this.getQualitySummary(applicationId);
      const completedKeys = getCompletedQualityActionKeys(summary);
      if (completedKeys.length === 0) return;

      await this.prisma.qualityCampaignActionLog.createMany({
        data: activeTargets.flatMap(({ campaignId }) =>
          completedKeys.map((actionKey) => ({
            campaignId,
            applicationId,
            actionKey,
            completedById: userId,
          })),
        ),
        skipDuplicates: true,
      });
    } catch (error) {
      Logger.error(
        `Échec de l'enregistrement des actions IQ de campagne pour l'application ${applicationId}:`,
        error,
      );
    }
  }

  async getQualityCampaignActions(
    applicationId: string,
  ): Promise<QualityCampaignActionDto[]> {
    const logs = await this.prisma.qualityCampaignActionLog.findMany({
      where: { applicationId },
      include: { campaign: { select: { name: true } }, completedBy: true },
      orderBy: { completedAt: "desc" },
    });

    return logs.map((log) => ({
      campaignId: log.campaignId,
      campaignName: log.campaign.name,
      actionKey: log.actionKey,
      actionLabel: getQualityActionLabel(log.actionKey),
      completedAt: log.completedAt,
      completedByEmail: log.completedBy?.email ?? null,
    }));
  }
}
