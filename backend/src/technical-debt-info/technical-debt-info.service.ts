import { Injectable } from "@nestjs/common";
import { ApplicationService } from "src/applications/application.service";
import { ServiceOptions } from "src/common/utils/types";
import { MetadatasService } from "src/metadatas/metadatas.service";
import { PrismaService } from "src/prisma/prisma.service";
import { BaseService } from "../common/base.service";
import { TechnicalDebtInfo } from "./entities/technical-debt-info.entity";
import { PaginatedResponseDto, PaginationDto } from "src/common/dto";

@Injectable()
export class TechnicalDebtInfoService extends BaseService<TechnicalDebtInfo> {
  constructor(
    prisma: PrismaService,
    metadataService: MetadatasService,
    applicationService: ApplicationService,
  ) {
    super(
      prisma.technicalDebtInfo,
      prisma,
      metadataService,
      applicationService,
    );
  }

  async create(
    createDto,
    options?: ServiceOptions<TechnicalDebtInfo>,
  ): Promise<TechnicalDebtInfo> {
    return super.create(createDto, options);
  }

  async findByApplicationId(
    applicationId: string,
    filters: Pick<PaginationDto, "page" | "pageSize">,
  ): Promise<PaginatedResponseDto<TechnicalDebtInfo>> {
    return this.model.paginate({
      where: { applicationId },
      orderBy: { createdAt: "desc" },
      ...filters,
    });
  }
}
