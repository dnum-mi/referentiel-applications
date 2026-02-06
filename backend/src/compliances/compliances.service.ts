import { ConflictException, Injectable } from "@nestjs/common";
import { MetadatasService } from "src/metadatas/metadatas.service";
import { PrismaService } from "src/prisma/prisma.service";
import { ApplicationService } from "src/product/application.service";
import { BaseService } from "../common/base.service";
import { Compliance } from "./entities/compliance.entity";
import { ServiceOptions } from "src/common/utils/types";

@Injectable()
export class CompliancesService extends BaseService<Compliance> {
  constructor(
    prisma: PrismaService,
    metadataService: MetadatasService,
    applicationService: ApplicationService,
  ) {
    super(prisma.compliance, prisma, metadataService, applicationService);
  }

  async create(
    createDto,
    options?: ServiceOptions<Compliance>,
  ): Promise<Compliance> {
    // Check if a compliance already exists for this application
    const applicationId = createDto.application.connect.id;
    if (applicationId) {
      const existingCompliance = await this.findByApplicationId(applicationId);
      if (existingCompliance) {
        throw new ConflictException(
          "A compliance already exists for this application",
        );
      }
    }
    return super.create(createDto, options);
  }

  async findByApplicationId(applicationId: string): Promise<Compliance | null> {
    return this.model.findFirst({ where: { applicationId } });
  }
}
