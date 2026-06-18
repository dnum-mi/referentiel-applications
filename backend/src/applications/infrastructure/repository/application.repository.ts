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
  constructor(private prisma: PrismaService) {}

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
        businessDivision: true,
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
      businessDivision: true,
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
    const { page, pageSize } = filters;

    const paginatedResult = await this.prisma.application.paginate({
      where,
      orderBy,
      page,
      pageSize,
      include: this.buildListInclude(),
    });

    // Calculate average IQ across all matching applications (not just paginated results)
    const avgResult = await this.prisma.application.aggregate({
      where,
      _avg: {
        quality: true,
      },
    });

    // Prisma decimal extension returns runtime numbers, so we cast to API DTOs.
    return {
      ...paginatedResult,
      // must use assertion due to paginate plugin doesn't preserve types if we are using limit select
      results: paginatedResult.results.map((app) =>
        this.flattenTechnicalDebt(app),
      ),
      averageIq: avgResult._avg.quality ?? 0,
    } as unknown as ApplicationSearchResultDto;
  }

  /**
   * Liste des applications triée par pertinence full-text.
   *
   * `where` contient déjà la restriction `id IN (matches FTS)` et l'ensemble des
   * filtres structurels (droits, conformité, hébergement, statut...). On
   * intersecte ces filtres avec l'ordre de pertinence fourni par le moteur de
   * recherche, puis on pagine et on charge les fiches de la page uniquement.
   */
  public async findApplicationsRanked(
    filters: ApplicationSearchFilters,
    where: Prisma.ApplicationWhereInput,
    rankedIds: string[],
  ): Promise<ApplicationSearchResultDto> {
    const { page = 0, pageSize = 15 } = filters;

    // 1. Quels ids (déjà restreints aux matches FTS) passent les filtres structurels ?
    const passing = await this.prisma.application.findMany({
      where,
      select: { id: true },
    });
    const passingSet = new Set(passing.map((app) => app.id));

    // 2. Conserver l'ordre de pertinence renvoyé par le moteur de recherche.
    const orderedIds = rankedIds.filter((id) => passingSet.has(id));
    const total = orderedIds.length;

    // 3. Paginer la liste d'ids (pageSize <= 0 => pas de pagination).
    const safePage = Math.max(0, page);
    const pageIds =
      pageSize > 0
        ? orderedIds.slice(safePage * pageSize, safePage * pageSize + pageSize)
        : orderedIds;

    // 4. Charger les fiches complètes de la page, puis ré-ordonner par pertinence.
    const records = pageIds.length
      ? await this.prisma.application.findMany({
          where: { id: { in: pageIds } },
          include: this.buildListInclude(),
        })
      : [];
    const byId = new Map(records.map((record) => [record.id, record]));
    const orderedResults = pageIds
      .map((id) => byId.get(id))
      .filter((record): record is NonNullable<typeof record> =>
        Boolean(record),
      );

    // 5. IQ moyen sur l'ensemble du résultat (toutes pages confondues).
    const avgResult = await this.prisma.application.aggregate({
      where: { id: { in: orderedIds } },
      _avg: { quality: true },
    });

    return {
      results: orderedResults.map((app) => this.flattenTechnicalDebt(app)),
      total,
      averageIq: avgResult._avg.quality ?? 0,
    } as unknown as ApplicationSearchResultDto;
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
          where: millesime != null ? { millesime } : undefined,
          orderBy: { createdAt: "desc" as const },
          take: 1,
          select: {
            technicalMaturity: true,
            businessMaturity: true,
            costMaturity: true,
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
