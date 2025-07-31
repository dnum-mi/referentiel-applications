import { Metadata } from '@prisma/client';

export interface IMetadataRepository {
  findAll(applicationId: string): Promise<Metadata[]>;
}
