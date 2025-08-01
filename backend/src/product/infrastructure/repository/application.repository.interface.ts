import type { Application } from "@prisma/client";
import type { CreateApplicationDto } from "src/product/application/dto/create-application.dto";

export interface IApplicationRepository {
  create: (
    application: CreateApplicationDto,
    applicationMetadataId: string,
    ownerId: string,
    actorsToCreate,
  ) => Promise<Application>
  delete: (id: string) => Promise<void>
}
