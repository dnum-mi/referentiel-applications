import type { Tag } from "@prisma/client";
import type { PaginatedResponseDto } from "src/common/dto/paginated-response.dto";
import type { CreateTagDto, TagFiltersDto, UpdateTagDto } from "src/tag/dto/tag.dto";

export interface ITagRepository {
  create: (tag: CreateTagDto) => Promise<Tag>
  findAll: (filters: TagFiltersDto) => Promise<PaginatedResponseDto<Tag>>
  findById: (id: string) => Promise<Tag | null>
  findByNames: (tagsNames?: string[]) => Promise<CreateTagDto[]>
  update: (id: string, data: UpdateTagDto) => Promise<Tag>
  delete: (id: string) => Promise<Tag>
}
