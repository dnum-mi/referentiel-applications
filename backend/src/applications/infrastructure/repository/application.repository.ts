import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { CreateApplicationDto } from "src/applications/dto/create-application.dto";
import { ApplicationSearchResultDto } from "src/applications/dto/get-application.dto";
import { TechnicalDebtPointDto } from "src/applications/dto/technical-debt-point.dto";
import { ApplicationWithAllRelations } from "src/applications/types/application.type";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateTagDto } from "src/tag/dto/tag.dto";
import {
  ApplicationSearchFilters,
  IApplicationRepository,
} from "./application.repository.interface";

@Injectable()
export class ApplicationRepository implements IApplicationRepository {
  constructor(private readonly prisma: PrismaService) {}

  public async create(
    application: Omit<CreateApplicationDto, "status" | "labels">,
    existingTags: CreateTagDto[],
  ) {
    return this.prisma.application.create({
      data: {
        ...application,
        tags: {
          connect: existingTags,
        },
        labels: undefined,
        quality: 0,
      },
      include: {
        tags: true,
      },
    });
  }

  public async findById(id: string) {
    return this.prisma.application.findUnique({
      where: { id },
      include: {
        currentStatus: true, // Include the current status via FK
        relationsAsSource: {
          include: { targetApplication: { select: { id: true, label: true } } },
        },
        relationsAsTarget: {
          include: { sourceApplication: { select: { id: true, label: true } } },
        },
        tags: true,
        businessDivisions: true,
      },
    });
  }

  /**
   * Relations chargées pour chaque ligne d'une liste d'applications. Partagé
   * entre la recherche classique (`findApplications`) et la recherche full-text
   * triée par pertinence (`findApplicationsRanked`).
   */
  private buildListInclude() {
    const since = new Date();
    since.setMonth(since.getMonth() - 12);

    return {
      currentStatus: true,
      technicalDebtInfo: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      businessDivisions: true,
      hostings: {
        include: {
          hostingOption: true,
        },
      },
      actors: {
        include: {
          organization: {
            select: { id: true, path: true, sigle: true },
          },
          actorType: true,
        },
      },
      compliance: true,
      labels: true,
      externalRessource: true,
      tags: true,
      _count: {
        select: {
          applicationViews: {
            where: {
              createdAt: { gte: since },
            },
          },
        },
      },
    } satisfies Prisma.ApplicationInclude;
  }

  /** Aplatit le dernier point de dette technique (relation historisée -> objet unique). */
  private flattenTechnicalDebt<T>(app: T): T {
    return {
      ...app,
      technicalDebtInfo:
        (app as unknown as { technicalDebtInfo: TechnicalDebtPointDto[] })
          .technicalDebtInfo[0] ?? null,
    };
  }

  public async findApplications(
    filters: ApplicationSearchFilters,
    where: Prisma.ApplicationWhereInput,
    orderBy: Prisma.ApplicationOrderByWithRelationInput,
  ): Promise<ApplicationSearchResultDto> {
    const { page = 0, pageSize } = filters;
    const skip =
      pageSize && pageSize > 0 ? Math.max(0, page) * pageSize : undefined;
    const take = pageSize && pageSize > 0 ? pageSize : undefined;

    // Une seule requête d'agrégation (total + IQ moyen sur l'ensemble des
    // résultats, toutes pages confondues), lancée en parallèle de la page.
    const [results, aggregate] = await Promise.all([
      this.prisma.application.findMany({
        where,
        orderBy,
        skip,
        take,
        include: this.buildListInclude(),
      }),
      this.prisma.application.aggregate({
        where,
        _count: { _all: true },
        _avg: { quality: true },
      }),
    ]);

    // Prisma decimal extension returns runtime numbers, so we cast to API DTOs.
    return {
      results: results.map((app) => this.flattenTechnicalDebt(app)),
      total: aggregate._count._all,
      averageIq: aggregate._avg.quality ?? 0,
    } as unknown as ApplicationSearchResultDto;
  }

  /**
   * Identifiants (et IQ) des applications passant les filtres structurels.
   * Une seule passe filtrée qui donne à la fois l'ensemble des résultats,
   * leur total et de quoi calculer l'IQ moyen — sans requête d'agrégation
   * supplémentaire.
   */
  public async findMatchingApplications(
    where: Prisma.ApplicationWhereInput,
  ): Promise<{ id: string; quality: number }[]> {
    return this.prisma.application.findMany({
      where,
      select: { id: true, quality: true },
    });
  }

  /**
   * Charge les fiches complètes d'une page d'identifiants, dans l'ordre fourni
   * (pertinence full-text ou tri SQL brut). `orderedIds` est déjà filtré ;
   * la pagination est appliquée ici (pageSize <= 0 => pas de pagination).
   */
  public async findApplicationsPage(
    filters: ApplicationSearchFilters,
    orderedIds: string[],
  ): Promise<ApplicationSearchResultDto["results"]> {
    const { page = 0, pageSize = 15 } = filters;

    const safePage = Math.max(0, page);
    const pageIds =
      pageSize > 0
        ? orderedIds.slice(safePage * pageSize, safePage * pageSize + pageSize)
        : orderedIds;

    if (!pageIds.length) return [];

    const records = await this.prisma.application.findMany({
      where: { id: { in: pageIds } },
      include: this.buildListInclude(),
    });
    const byId = new Map(records.map((record) => [record.id, record]));

    // Prisma decimal extension returns runtime numbers, so we cast to API DTOs.
    return pageIds
      .map((id) => byId.get(id))
      .filter((record): record is NonNullable<typeof record> => Boolean(record))
      .map((app) =>
        this.flattenTechnicalDebt(app),
      ) as unknown as ApplicationSearchResultDto["results"];
  }

  /**
   * Millésime de campagne dette IT le plus récent enregistré, tous applications
   * confondues. `null` s'il n'existe aucune évaluation.
   */
  public async findLatestMillesime(): Promise<number | null> {
    const latest = await this.prisma.technicalDebtInfo.aggregate({
      _max: { millesime: true },
    });
    return latest._max.millesime ?? null;
  }

  /**
   * Millésimes de campagne dette IT disponibles, triés du plus récent au plus
   * ancien.
   */
  public async findDistinctMillesimes(): Promise<number[]> {
    const rows = await this.prisma.technicalDebtInfo.findMany({
      distinct: ["millesime"],
      select: { millesime: true },
      orderBy: { millesime: "desc" },
    });
    return rows.map((row) => row.millesime);
  }

  public async findTechnicalDebtPoints(
    where: Prisma.ApplicationWhereInput,
    orderBy: Prisma.ApplicationOrderByWithRelationInput,
    millesime?: number,
  ): Promise<TechnicalDebtPointDto[]> {
    const results = await this.prisma.application.findMany({
      where,
      orderBy,
      select: {
        id: true,
        label: true,
        shortName: true,
        technicalDebtInfo: {
          where: millesime == null ? undefined : { millesime },
          orderBy: { createdAt: "desc" as const },
          take: 1,
          select: {
            technicalMaturity: true,
            businessMaturity: true,
            costContainment: true,
            millesime: true,
          },
        },
      },
    });

    // Prisma decimal extension returns runtime numbers, so we cast to API DTOs.
    // technicalDebtInfo is now a list (historized), we extract the most recent entry.
    return results.map((app) => ({
      ...app,
      technicalDebtInfo: app.technicalDebtInfo[0] ?? null,
    })) as unknown as TechnicalDebtPointDto[];
  }

  async findAllWithFullRelations(): Promise<ApplicationWithAllRelations[]> {
    return await this.prisma.application.findMany({
      include: {
        currentStatus: true,
        metadatas: true,
        compliance: true,
        labels: {
          include: {
            labelSource: true,
          },
        },
        tags: true,
        externalRessource: true,
        reports: true,
        statuses: true,
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

  public async delete(id: string): Promise<void> {
    await this.prisma.application.delete({
      where: { id },
    });
  }
}
