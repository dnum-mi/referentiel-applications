import { Injectable } from "@nestjs/common";
import { DataFamily, Prisma } from "@prisma/client";
import { BaseService } from "src/common/base.service";
import { PaginatedResponseDto } from "src/common/dto";
import { PrismaService } from "src/prisma/prisma.service";
import { DataFamilyFiltersDto } from "./dto/data-family.dto";

@Injectable()
export class DataFamilyService extends BaseService<DataFamily> {
  constructor(prisma: PrismaService) {
    super(prisma.dataFamily, prisma);
  }

  findAllFamilies(
    filters?: DataFamilyFiltersDto,
  ): Promise<PaginatedResponseDto<DataFamily>> {
    const where: Prisma.DataFamilyWhereInput = {};
    if (filters?.path) {
      where.path = { contains: filters.path, mode: "insensitive" };
    }

    return this.findAll({
      where,
      orderBy: { path: "asc" },
      page: filters?.page,
      pageSize: filters?.pageSize,
    });
  }
}
