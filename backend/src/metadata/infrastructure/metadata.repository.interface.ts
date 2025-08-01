import { Metadata } from '@prisma/client';

export interface IMetadataRepository {
  findAll(applicationId: string): Promise<Metadata[]>;
  findFirstAndLastByApplicationId(applicationId: string): Promise<{
    first: Metadata | null;
    last: Metadata | null;
  }>;
}
