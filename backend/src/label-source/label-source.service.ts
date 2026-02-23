import type { LabelSource, Prisma } from "@prisma/client";
import { Injectable } from "@nestjs/common";
import { BaseService } from "../common/base.service";
import { PrismaService } from "../prisma/prisma.service";
import { LabelSourceFiltersDto } from "./dto/label-source.dto";

@Injectable()
export class LabelSourceService extends BaseService<LabelSource> {
  constructor(prisma: PrismaService) {
    super(prisma.labelSource, prisma);
  }

  async findAll(filters?: LabelSourceFiltersDto) {
    const where: Prisma.LabelSourceWhereInput = {};
    if (filters.source) {
      where.source = { contains: filters.source, mode: "insensitive" };
    }

    return this.prisma.labelSource.findMany({
      where,
      orderBy: [{ source: "asc" }],
    });
  }
}
