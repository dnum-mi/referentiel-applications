import type { Application } from "@prisma/client";
import type { PaginatedResponseDto } from "src/common/dto";
import type { CreateApplicationDto } from "src/product/application/dto/create-application.dto";
import type { ApplicationDto } from "src/product/application/dto/get-application.dto";
import type { TechnicalDebtPointDto } from "src/product/application/dto/technical-debt-point.dto";
import type { ApplicationSearchDto } from "src/product/application/dto/search-application.dto";
import type { CreateTagDto } from "src/tag/dto/tag.dto";

export type ApplicationSearchFilters = ApplicationSearchDto;

export interface IApplicationRepository {
  create: (
    application: CreateApplicationDto,
    existingTags: CreateTagDto[],
  ) => Promise<Application>;
  delete: (id: string) => Promise<void>;
  findApplications: (
    search: ApplicationSearchFilters,
    ownership?: { actorEmail?: string },
  ) => Promise<PaginatedResponseDto<ApplicationDto>>;
  findTechnicalDebtPoints: (
    search: ApplicationSearchFilters,
    ownership?: { actorEmail?: string },
  ) => Promise<TechnicalDebtPointDto[]>;
}
