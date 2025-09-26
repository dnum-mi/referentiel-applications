import type { Metadata } from "@prisma/client";
import type { MetadataDto } from "../dto/metadata.dto";
import type { PaginatedResponseDto, PaginationDto } from "src/common/dto";

export interface IMetadataRepository {
  findAll: (applicationId?: string, pagination?: PaginationDto) => Promise<(PaginatedResponseDto<MetadataDto> & {
    createdBy?: any
    application?: { id: string, label: string }
  })[]>

  findFirstAndLastByApplicationId: (applicationId: string) => Promise<{
    first: Metadata | null
    last: Metadata | null
  }>
}
