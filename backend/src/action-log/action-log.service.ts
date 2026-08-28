import { Injectable } from "@nestjs/common";
import { ActionLog, Prisma } from "@prisma/client";
import { PaginatedResponseDto } from "src/common/dto";
import { PrismaService } from "src/prisma/prisma.service";
import { ActionLogFiltersDto } from "./dto/action-log.dto";

@Injectable()
export class ActionLogService {
  constructor(private readonly prisma: PrismaService) {}

  public async findAllPaginated(
    filters: ActionLogFiltersDto,
  ): Promise<PaginatedResponseDto<ActionLog>> {
    const where: Prisma.ActionLogWhereInput = {};

    if (filters.createdAtGte || filters.createdAtLte) {
      where.createdAt = {};
      if (filters.createdAtGte) {
        where.createdAt.gte = new Date(filters.createdAtGte);
      }
      if (filters.createdAtLte) {
        where.createdAt.lte = new Date(filters.createdAtLte);
      }
    }

    if (filters.search) {
      where.OR = [
        { path: { contains: filters.search, mode: "insensitive" } },
        {
          user: {
            email: { contains: filters.search, mode: "insensitive" },
          },
        },
        {
          impersonator: {
            email: { contains: filters.search, mode: "insensitive" },
          },
        },
      ];
    }

    return this.prisma.actionLog.paginate({
      where,
      page: filters.page,
      pageSize: filters.pageSize,
      orderBy: { createdAt: "desc" },
      include: { user: true, impersonator: true },
    });
  }
}
