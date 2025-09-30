import type { Metadata } from "@prisma/client";
import type { MetadataFiltersDto } from "../dto/metadata.dto";
import type { PaginatedResponseDto } from "src/common/dto";

export interface IMetadataRepository {
  findAll: (filters?: MetadataFiltersDto & { applicationId?: string }) => Promise<PaginatedResponseDto<any>>

  findFirstAndLastByApplicationId: (applicationId: string) => Promise<{
    first: Metadata | null
    last: Metadata | null
  }>
}
