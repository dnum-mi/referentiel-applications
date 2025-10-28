import type { Tag } from "@prisma/client";
import type { CreateTagDto, TagDto, TagFiltersDto, UpdateTagDto } from "src/tag/dto/tag.dto";

export interface ITagRepository {
  create: (tag: CreateTagDto) => Promise<Tag>
  findAll: (filters: TagFiltersDto) => Promise<TagDto[]>
  findById: (id: string) => Promise<Tag | null>
  findByNames: (tagsNames?: string[]) => Promise<CreateTagDto[]>
  update: (id: string, data: UpdateTagDto) => Promise<Tag>
  delete: (id: string) => Promise<Tag>
}
