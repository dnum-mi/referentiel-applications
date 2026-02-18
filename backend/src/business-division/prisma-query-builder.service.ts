import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { BusinessDivisionFiltersDto } from "./dto/business-division.dto";

@Injectable()
export class PrismaQueryBuilder {
  public buildSearchWhere(filters: BusinessDivisionFiltersDto) {
    // Build a single comprehensive where clause with all filters
    const where: { AND: Prisma.BusinessDivisionWhereInput[] } = { AND: [] };

    where.AND.push({
      label: {
        startsWith: filters.label,
        mode: "insensitive" as const,
      },
    });

    return where;
  }

  public buildOrderBy(filters: BusinessDivisionFiltersDto) {
    let orderBy: Prisma.BusinessDivisionOrderByWithRelationInput = {};

    if (filters.sortBy) {
      const sortField = filters.sortBy === "createdAt" ? "createdAt" : "label";
      const sortOrder: Prisma.SortOrder =
        filters.order === "desc" ? "desc" : "asc";

      orderBy = {
        [sortField]: sortOrder,
      };
    }

    return orderBy;
  }
}
