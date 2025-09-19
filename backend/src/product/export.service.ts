import { ExportApplicationsUseCase } from "./application/usecases/application-export.usecase";
import { Injectable } from "@nestjs/common";
import { ApplicationRepository } from "./infrastructure/repository/application.repository";
import { ApplicationSearchDto } from "./application/dto/search-application.dto";

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
      = await this.repository.findAllWithRelations();
    const filteredApplications = applicationsWithRelations.filter(app =>
      filteredIds.includes(app.id),
    );

    return this.exportApplicationsUseCase.executeWithApps(filteredApplications);
  }
}
