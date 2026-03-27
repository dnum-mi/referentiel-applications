import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { OrganizationFilterDto } from "./dto/filters.dto";

@Injectable()
export class PrismaQueryBuilder {
  buildSearchWhere(
    filters: OrganizationFilterDto,
  ): Prisma.OrganizationWhereInput {
    if (filters.search) {
      const conditions: Prisma.OrganizationWhereInput[] = [
        {
          OR: [
            { path: { contains: filters.search, mode: "insensitive" } },
            { sigle: { contains: filters.search, mode: "insensitive" } },
            { url: { contains: filters.search, mode: "insensitive" } },
          ],
        },
      ];
      if (filters.usedOnly) {
        conditions.push({
          OR: [{ actors: { some: {} } }, { users: { some: {} } }],
        });
      }
      return { AND: conditions };
    }

    if (!filters.ids?.length) {
      return { parentId: null };
    }

    return filters.withChildren
      ? {
          OrganizationClosureDescendant: {
            some: { ancestorId: { in: filters.ids } },
          },
        }
      : {
          OrganizationClosureAncestor: {
            some: { descendantId: { in: filters.ids } },
          },
        };
  }
}
