import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import {
  CorrelationSuggestionWithApplications,
  FindAllCorrelationSuggestionsOptions,
  ICorrelationSuggestionRepository,
} from "./correlation-suggestion.repository.interface";

const APPLICATION_INCLUDE = {
  sourceApplication: { select: { id: true, label: true } },
  targetApplication: { select: { id: true, label: true } },
} as const;

/** Champs de tri autorisés ; tout autre `sortBy` retombe sur le score. */
const SORTABLE_FIELDS = ["score", "createdAt", "status"] as const;

@Injectable()
export class CorrelationSuggestionRepository
  implements ICorrelationSuggestionRepository
{
  constructor(private readonly prisma: PrismaService) {}

  public async findAllPaginated({
    status,
    page,
    pageSize,
    sortBy,
    order,
  }: FindAllCorrelationSuggestionsOptions): Promise<{
    results: CorrelationSuggestionWithApplications[];
    total: number;
  }> {
    const where: Prisma.CorrelationSuggestionWhereInput = status
      ? { status }
      : {};

    const sortField = SORTABLE_FIELDS.find((field) => field === sortBy)
      ? (sortBy as (typeof SORTABLE_FIELDS)[number])
      : "score";
    const orderBy = { [sortField]: order ?? "desc" };

    const effectivePageSize = pageSize ?? 15;
    // pageSize=0 : pagination désactivée (convention PaginationDto)
    const pagination =
      effectivePageSize > 0
        ? { skip: (page ?? 0) * effectivePageSize, take: effectivePageSize }
        : {};

    const [results, total] = await this.prisma.$transaction([
      this.prisma.correlationSuggestion.findMany({
        where,
        orderBy,
        include: APPLICATION_INCLUDE,
        ...pagination,
      }),
      this.prisma.correlationSuggestion.count({ where }),
    ]);

    return { results, total };
  }

  public async findOne(
    id: string,
  ): Promise<CorrelationSuggestionWithApplications | null> {
    return await this.prisma.correlationSuggestion.findUnique({
      where: { id },
      include: APPLICATION_INCLUDE,
    });
  }
}
