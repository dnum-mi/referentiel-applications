import type { Metadata } from "@prisma/client";
import type { MetadataFiltersDto, MetadataPaginatedResponseDto } from "../dto/metadata.dto";

export interface IMetadataRepository {
  findAll: (filters?: MetadataFiltersDto & { applicationId?: string }) => Promise<MetadataPaginatedResponseDto>

  findFirstAndLastByApplicationId: (applicationId: string) => Promise<{
    first: Metadata | null
    last: Metadata | null
  }>
}
