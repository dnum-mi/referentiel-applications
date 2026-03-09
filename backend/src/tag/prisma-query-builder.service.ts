import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { TagFiltersDto } from "./dto/tag.dto";

@Injectable()
export class PrismaQueryBuilder {
  public buildSearchWhere(filters: TagFiltersDto): Prisma.TagWhereInput {
    return filters.name
      ? { name: { startsWith: filters.name, mode: "insensitive" } }
      : {};
  }

  public buildOrderBy(
    filters: TagFiltersDto,
  ): Prisma.TagOrderByWithRelationInput {
    if (filters.sortBy) {
      const sortField = filters.sortBy === "createdAt" ? "createdAt" : "name";
      const sortOrder: Prisma.SortOrder =
        filters.order === "desc" ? "desc" : "asc";

      return {
        [sortField]: sortOrder,
      };
    }

    return {
      applications: { _count: "desc" },
    };
  }
}
