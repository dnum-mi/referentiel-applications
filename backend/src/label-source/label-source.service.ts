import type { LabelSource, Prisma } from "@prisma/client";
import { Injectable } from "@nestjs/common";
import { BaseService } from "../common/base.service";
import { PrismaService } from "../prisma/prisma.service";
import { LabelSourceFiltersDto } from "./dto/label-source.dto";
import { PaginatedResponseDto } from "src/common/dto";

@Injectable()
export class LabelSourceService extends BaseService<LabelSource> {
  constructor(prisma: PrismaService) {
    super(prisma.labelSource, prisma);
  }

  async findAllLabelSources(
    filters?: LabelSourceFiltersDto,
  ): Promise<PaginatedResponseDto<LabelSource>> {
    const where: Prisma.LabelSourceWhereInput = {};
    if (filters && filters.source) {
      where.source = { contains: filters.source, mode: "insensitive" };
    }

    return this.findAll({
      where,
      orderBy: [{ source: filters?.order ?? "asc" }],
      page: filters?.page,
      pageSize: filters?.pageSize,
      include: {
        _count: { select: { Label: true } },
      },
    });
  }
}
