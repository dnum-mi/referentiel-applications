import { Injectable } from "@nestjs/common";
import { ApplicationSearchDto } from "./dto/search-application.dto";
import { ExportApplicationsUseCase } from "./usecases/application-export.usecase";
import { ApplicationRepository } from "./infrastructure/repository/application.repository";
import { PrismaQueryBuilder } from "./prisma-query-builder.service";
import { Requestor } from "src/user/entities/user.entity";
import { CheckPermissions } from "src/common/service/check-permissions.service";
import { Permission } from "@prisma/client";
import { ApplicationSearchService } from "./search/application-search.service";

@Injectable()
export class ApplicationExportService {
  constructor(
    private readonly repository: ApplicationRepository,
    private readonly exportApplicationsUseCase: ExportApplicationsUseCase,
    private readonly prismaQueryBuilder: PrismaQueryBuilder,
    private readonly checkPermissions: CheckPermissions,
    private readonly applicationSearchService: ApplicationSearchService,
  ) {}

  async exportSearchResultsToExcel(
    searchParams: ApplicationSearchDto,
    requestor: Requestor,
  ): Promise<Buffer> {
    const where = await this.buildScopedWhere(searchParams, requestor);
    if (!where) return this.exportApplicationsUseCase.executeWithApps([]);

    const { sortBy = "shortName", order = "asc" } = searchParams;
    const orderBy = this.prismaQueryBuilder.buildOrderBy(sortBy, order);
    const applications = await this.repository.findAllWithFullRelations(
      where,
      orderBy,
    );

    return this.exportApplicationsUseCase.executeWithApps(applications);
  }

  /// Filtre de recherche restreint au périmètre du demandeur, sans pagination : toutes les
  /// applications correspondant aux filtres, quel que soit `page`/`pageSize`. Mêmes filtres que
  /// la recherche (ApplicationService.search), millésime et texte libre compris.
  /// `null` si le demandeur ne peut lire aucune application.
  async buildScopedWhere(
    searchParams: ApplicationSearchDto,
    requestor: Requestor,
  ) {
    const hasAppList = await this.checkPermissions.can(
      [Permission.AppList],
      requestor,
    );
    const hasAppRead = await this.checkPermissions.can(
      [Permission.AppRead],
      requestor,
    );
    if (!hasAppList && !hasAppRead) return null;

    const where = await this.prismaQueryBuilder.buildSearchWhere(
      searchParams,
      requestor,
      hasAppList
        ? undefined
        : {
            actorEmail: requestor?.email,
            businessDivisionId: requestor?.organization?.businessDivisionId,
          },
    );
    if (searchParams.millesime != null) {
      where.AND.push(
        this.prismaQueryBuilder.buildTechnicalDebtInfo(searchParams.millesime),
      );
    }
    // `qPrefix` (autocomplétion) est prioritaire sur `q`, comme dans la recherche.
    const prefixText = searchParams.qPrefix?.trim();
    const fullText = searchParams.q?.trim();
    if (prefixText || fullText) {
      const ranked = prefixText
        ? await this.applicationSearchService.fullTextSearchPrefix(prefixText)
        : await this.applicationSearchService.fullTextSearch(fullText!);
      where.AND.push({ id: { in: ranked.map(({ id }) => id) } });
    }
    return where;
  }
}
