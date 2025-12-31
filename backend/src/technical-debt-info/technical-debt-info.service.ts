import { ConflictException, Injectable } from "@nestjs/common";
import { MetadatasService } from "src/metadatas/metadatas.service";
import { PrismaService } from "src/prisma/prisma.service";
import { ApplicationService } from "src/product/application.service";
import { BaseService } from "../common/base.service";
import { TechnicalDebtInfo } from "./entities/technical-debt-info.entity";

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

  async create(createDto): Promise<TechnicalDebtInfo> {
    const applicationId = createDto.application.connect.id;
    if (applicationId) {
      const existing = await this.findByApplicationId(applicationId);
      if (existing) {
        throw new ConflictException(
          "A technical debt info already exists for this application",
        );
      }
    }
    return super.create(createDto);
  }

  async findByApplicationId(
    applicationId: string,
  ): Promise<TechnicalDebtInfo | null> {
    return this.model.findFirst({ where: { applicationId } });
  }
}
