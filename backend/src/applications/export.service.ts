import { Injectable } from "@nestjs/common";
import { ApplicationSearchDto } from "./dto/search-application.dto";
import { ExportApplicationsUseCase } from "./usecases/application-export.usecase";
import { ApplicationRepository } from "./infrastructure/repository/application.repository";
import { PrismaQueryBuilder } from "./prisma-query-builder.service";
import { Requestor } from "src/user/entities/user.entity";
import { CheckPermissions } from "src/common/service/check-permissions.service";
import { Permission } from "@prisma/client";
import type { ApplicationWithAllRelations } from "./types/application.type";

@Injectable()
export class ApplicationExportService {
  constructor(
    private readonly repository: ApplicationRepository,
    private readonly exportApplicationsUseCase: ExportApplicationsUseCase,
    private readonly prismaQueryBuilder: PrismaQueryBuilder,
    private readonly checkPermissions: CheckPermissions,
  ) {}

  async exportSearchResultsToExcel(
    searchParams: ApplicationSearchDto,
    requestor: Requestor,
  ): Promise<Buffer> {
    return this.exportApplicationsUseCase.executeWithApps(
      await this.getSearchResults(searchParams, requestor),
    );
  }

  async exportSearchResultsToHtml(
    searchParams: ApplicationSearchDto,
    requestor: Requestor,
  ): Promise<Buffer> {
    return this.exportApplicationsUseCase.executeHtmlWithApps(
      await this.getSearchResults(searchParams, requestor),
    );
  }

  private async getSearchResults(
    searchParams: ApplicationSearchDto,
    requestor: Requestor,
  ): Promise<ApplicationWithAllRelations[]> {
    const where = await this.buildScopedWhere(searchParams, requestor);
    if (where === null) return [];

    const { sortBy = "shortName", order = "asc" } = searchParams;
    const orderBy = this.prismaQueryBuilder.buildOrderBy(sortBy, order);
    return this.repository.findAllWithFullRelations(where, orderBy);
  }

  /// Filtre de recherche restreint au périmètre du demandeur, sans pagination : toutes les
  /// applications correspondant aux filtres, quel que soit `page`/`pageSize`.
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

    return this.prismaQueryBuilder.buildSearchWhere(
      searchParams,
      requestor,
      hasAppList
        ? undefined
        : {
            actorEmail: requestor?.email,
            businessDivisionId: requestor?.organization?.businessDivisionId,
          },
    );
  }
}
