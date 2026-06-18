import type { Application, Prisma } from "@prisma/client";
import type { CreateApplicationDto } from "src/applications/dto/create-application.dto";
import type { ApplicationSearchResultDto } from "src/applications/dto/get-application.dto";
import type { TechnicalDebtPointDto } from "src/applications/dto/technical-debt-point.dto";
import type { ApplicationSearchDto } from "src/applications/dto/search-application.dto";
import type { CreateTagDto } from "src/tag/dto/tag.dto";

export type ApplicationSearchFilters = ApplicationSearchDto;

export interface IApplicationRepository {
  create: (
    application: CreateApplicationDto,
    existingTags: CreateTagDto[],
  ) => Promise<Application>;
  delete: (id: string) => Promise<void>;
  findApplications: (
    filters: ApplicationSearchFilters,
    where: Prisma.ApplicationWhereInput,
    orderBy: Prisma.ApplicationOrderByWithRelationInput,
  ) => Promise<ApplicationSearchResultDto>;
  findApplicationsRanked: (
    filters: ApplicationSearchFilters,
    where: Prisma.ApplicationWhereInput,
    rankedIds: string[],
  ) => Promise<ApplicationSearchResultDto>;
  findTechnicalDebtPoints: (
    where: Prisma.ApplicationWhereInput,
    orderBy: Prisma.ApplicationOrderByWithRelationInput,
    millesime?: number,
  ) => Promise<TechnicalDebtPointDto[]>;
  findLatestMillesime: () => Promise<number | null>;
  findDistinctMillesimes: () => Promise<number[]>;
}
