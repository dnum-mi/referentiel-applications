import { Injectable } from "@nestjs/common";
import { ApplicationSearchDto } from "./dto/search-application.dto";
import { ExportApplicationsUseCase } from "./usecases/application-export.usecase";
import { ApplicationRepository } from "./infrastructure/repository/application.repository";
import { PrismaQueryBuilder } from "./prisma-query-builder.service";
import { Requestor } from "src/user/entities/user.entity";
import { CheckPermissions } from "src/common/service/check-permissions.service";
import { Permission } from "@prisma/client";
import { ApplicationSearchResultDto } from "./dto/get-application.dto";

@Injectable()
export class ApplicationExportService {
  constructor(
    private readonly repository: ApplicationRepository,
    private readonly exportApplicationsUseCase: ExportApplicationsUseCase,
    private readonly prismaQueryBuilder: PrismaQueryBuilder,
    private readonly checkPermissions: CheckPermissions,
  ) {}

  async exportApplicationsToExcel(): Promise<Buffer> {
    return this.exportApplicationsUseCase.execute();
  }

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
    let allMatchingApps: ApplicationSearchResultDto;
    if (!hasAppList && !hasAppRead) {
      allMatchingApps = { results: [], total: 0, averageIq: 0 };
    } else {
      const where = this.prismaQueryBuilder.buildSearchWhere(
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
      allMatchingApps = await this.repository.findApplications(
        searchParams,
        where,
        orderBy,
      );
    }

    // Get full relations for the filtered applications
    const filteredIds = allMatchingApps.results.map((app) => app.id);
    const applicationsWithRelations =
      await this.repository.findAllWithFullRelations();
    const filteredApplications = applicationsWithRelations.filter((app) =>
      filteredIds.includes(app.id),
    );

    return this.exportApplicationsUseCase.executeWithApps(filteredApplications);
  }
}
