import { Application } from '@prisma/client';
import { CreateApplicationDto } from 'src/product/application/dto/create-application.dto';

export interface IApplicationRepository {
  create(
    application: CreateApplicationDto,
    applicationMetadataId: string,
    ownerId: string,
    actorsToCreate,
  ): Promise<Application>;
}
