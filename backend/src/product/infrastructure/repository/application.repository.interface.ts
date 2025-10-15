import type { Application } from "@prisma/client";
import type { CreateApplicationDto } from "src/product/application/dto/create-application.dto";
import type { ApplicationDto } from "src/product/application/dto/get-application.dto";
import type { ApplicationSearchDto } from "src/product/application/dto/search-application.dto";
import type { PaginatedResponseDto } from "src/common/dto";

export type ApplicationSearchFilters = ApplicationSearchDto;

export interface IApplicationRepository {
  create: (
    application: CreateApplicationDto,
  ) => Promise<Application>
  delete: (id: string) => Promise<void>
  findApplications: (
    search: ApplicationSearchFilters,
    ownership?: { actorEmail?: string },
  ) => Promise<PaginatedResponseDto<ApplicationDto>>
}
