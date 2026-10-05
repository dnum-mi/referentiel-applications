import { Injectable } from "@nestjs/common";
import { ApplicationSearchDto } from "./dto/search-application.dto";
import { ExportApplicationsUseCase } from "./usecases/application-export.usecase";
import { ApplicationRepository } from "./infrastructure/repository/application.repository";
import { PrismaQueryBuilder } from "./prisma-query-builder.service";
import { Requestor } from "src/user/entities/user.entity";
import { CheckPermissions } from "src/common/service/check-permissions.service";
import { Permission } from "@prisma/client";

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
    const hasAppList = await this.checkPermissions.can(
      [Permission.AppList],
      requestor,
    );
    const hasAppRead = await this.checkPermissions.can(
      [Permission.AppRead],
      requestor,
    );
    if (!hasAppList && !hasAppRead) {
      return this.exportApplicationsUseCase.executeWithApps([]);
    }

    // Filtrage et tri en base, sans pagination : l'export porte sur toutes les
    // applications correspondant aux filtres, quel que soit `page`/`pageSize`.
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
    const { sortBy = "shortName", order = "asc" } = searchParams;
    const orderBy = this.prismaQueryBuilder.buildOrderBy(sortBy, order);
    const applications = await this.repository.findAllWithFullRelations(
      where,
      orderBy,
    );

    return this.exportApplicationsUseCase.executeWithApps(applications);
  }
}
