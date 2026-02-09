import { Injectable } from "@nestjs/common";
import { ApplicationSearchDto } from "./dto/search-application.dto";
import { ExportApplicationsUseCase } from "./usecases/application-export.usecase";
import { ApplicationRepository } from "./infrastructure/repository/application.repository";
import { PrismaQueryBuilder } from "./prisma-query-builder.service";

@Injectable()
export class ApplicationExportService {
  constructor(
    private readonly repository: ApplicationRepository,
    private readonly exportApplicationsUseCase: ExportApplicationsUseCase,
    private readonly prismaQueryBuilder: PrismaQueryBuilder,
  ) {}

  async exportApplicationsToExcel(): Promise<Buffer> {
    return this.exportApplicationsUseCase.execute();
  }

  async exportSearchResultsToExcel(
    searchParams: ApplicationSearchDto,
  ): Promise<Buffer> {
    const where = this.prismaQueryBuilder.buildSearchWhere(searchParams);
    const { sortBy = "shortName", order = "asc" } = searchParams;
    const orderBy = this.prismaQueryBuilder.buildOrderBy(sortBy, order);
    const allMatchingApps = await this.repository.findApplications(
      searchParams,
      where,
      orderBy,
    );

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
