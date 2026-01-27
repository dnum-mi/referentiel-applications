import type { Metadata } from "@prisma/client";
import type { MetadataFiltersDto, MetadataDto } from "../dto/metadata.dto";
import { PaginatedResponseDto } from "src/common/dto/paginated-response.dto";

export interface IMetadataRepository {
  findAll: (
    filters?: MetadataFiltersDto & { applicationId?: string },
  ) => Promise<PaginatedResponseDto<MetadataDto>>;

  findOne: (id: string) => Promise<Metadata | null>;

  findFirstAndLastByApplicationId: (applicationId: string) => Promise<{
    first: Metadata | null;
    last: Metadata | null;
  }>;
}
