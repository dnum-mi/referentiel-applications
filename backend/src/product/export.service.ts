import { Injectable } from "@nestjs/common";
import { ApplicationSearchDto } from "./application/dto/search-application.dto";
import { ExportApplicationsUseCase } from "./application/usecases/application-export.usecase";
import { ApplicationRepository } from "./infrastructure/repository/application.repository";

@Injectable()
export class ApplicationExportService {
  constructor(
    private readonly repository: ApplicationRepository,
    private readonly exportApplicationsUseCase: ExportApplicationsUseCase,
  ) {}

  async exportApplicationsToExcel(): Promise<Buffer> {
    return this.exportApplicationsUseCase.execute();
  }

  async exportSearchResultsToExcel(
    searchParams: ApplicationSearchDto,
  ): Promise<Buffer> {
    const allMatchingApps = await this.repository.findApplications(searchParams);

    // Get full relations for the filtered applications
    const filteredIds = allMatchingApps.results.map(app => app.id);
    const applicationsWithRelations
      = await this.repository.findAllWithFullRelations();
    const filteredApplications = applicationsWithRelations.filter(app =>
      filteredIds.includes(app.id),
    );

    return this.exportApplicationsUseCase.executeWithApps(filteredApplications);
  }
}
