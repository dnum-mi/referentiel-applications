import { Injectable } from "@nestjs/common";
import { MetadatasService } from "src/metadatas/metadatas.service";
import { PrismaService } from "src/prisma/prisma.service";
import { BaseService } from "../common/base.service";
import { DataSource } from "./entities/data-source.entity";
import { PaginatedResponseDto } from "src/common/dto";
import { DataSourceDto, DataSourceFiltersDto } from "./dto/data-source.dto";
import { Prisma } from "@prisma/client";

@Injectable()
export class DataSourceService extends BaseService<DataSource> {
  constructor(prisma: PrismaService, metadataService: MetadatasService) {
    super(prisma.dataSource, prisma, metadataService);
  }

  async find(
    filters: DataSourceFiltersDto & { applicationId: string },
  ): Promise<PaginatedResponseDto<DataSourceDto>> {
    const where: Prisma.DataSourceWhereInput = {
      applicationId: filters.applicationId,
    };

    return this.findAll({
      where,
      page: filters.page,
      pageSize: filters.pageSize,
      orderBy: filters.sortBy
        ? { [filters.sortBy]: filters.order || "asc" }
        : { name: "asc" },
      include: {
        type: true,
        sensibility: true,
        family: true,
        updateFrequency: true,
      },
    });
  }
}
