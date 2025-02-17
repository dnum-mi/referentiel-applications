import { Organization } from '@prisma/client';
import { CreateOrganizationDto } from 'src/organization/dto/create-organization.dto';

export interface IOrganizationRepository {
  create(organization: CreateOrganizationDto): Promise<Organization>;
}
