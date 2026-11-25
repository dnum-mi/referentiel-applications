import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { OrganizationFilterDto } from "./dto/filters.dto";

@Injectable()
export class PrismaQueryBuilder {
  buildSearchWhere(
    filters: OrganizationFilterDto,
  ): Prisma.OrganizationWhereInput {
    if (filters.search) {
      const match = { contains: filters.search, mode: "insensitive" } as const;
      const conditions: Prisma.OrganizationWhereInput[] = [
        {
          OR: [
            { path: match },
            { sigle: match },
            { url: match },
            { maiaReferences: { some: { maiaRef: match } } },
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

    return { id: { in: filters.ids } };
  }
}
