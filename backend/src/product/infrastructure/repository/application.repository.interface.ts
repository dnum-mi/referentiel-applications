import type { Application } from "@prisma/client";
import type { CreateApplicationDto } from "src/product/application/dto/create-application.dto";
import type { ApplicationDto } from "src/product/application/dto/get-application.dto";
import type { ApplicationSearchDto } from "src/product/application/dto/search-application.dto";

export type ApplicationSearchFilters = ApplicationSearchDto;

export interface IApplicationRepository {
  create: (
    application: CreateApplicationDto,
    applicationMetadataId: string,
    ownerId: string,
    actorsToCreate,
  ) => Promise<Application>
  delete: (id: string) => Promise<void>
  findApplicationsBySearch: (
    search: ApplicationSearchFilters,
    ownership?: { actorEmail?: string, ownerId?: string },
  ) => Promise<{ results: ApplicationDto[], total: number }>
}
