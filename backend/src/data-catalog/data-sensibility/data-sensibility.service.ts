import { Injectable } from "@nestjs/common";
import { DataSensibility, Prisma } from "@prisma/client";
import { BaseService } from "src/common/base.service";
import { PaginatedResponseDto } from "src/common/dto";
import { PrismaService } from "src/prisma/prisma.service";
import { DataSensibilityFiltersDto } from "./dto/data-sensibility.dto";

@Injectable()
export class DataSensibilityService extends BaseService<DataSensibility> {
  constructor(prisma: PrismaService) {
    super(prisma.dataSensibility, prisma);
  }

  findAllSensibilities(
    filters?: DataSensibilityFiltersDto,
  ): Promise<PaginatedResponseDto<DataSensibility>> {
    const where: Prisma.DataSensibilityWhereInput = {};
    if (filters?.label) {
      where.label = { contains: filters.label, mode: "insensitive" };
    }

    return this.findAll({
      where,
      orderBy: { label: "asc" },
      page: filters?.page,
      pageSize: filters?.pageSize,
    });
  }
}
