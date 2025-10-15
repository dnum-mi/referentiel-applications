import { Injectable, ConflictException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { BaseService } from "../common/base.service";
import { Compliance } from "./entities/compliance.entity";
import { MetadataService } from "src/metadata/metadata.service";
import { ApplicationService } from "src/product/application.service";

@Injectable()
export class CompliancesService extends BaseService<Compliance> {
  constructor(
    prisma: PrismaService,
    metadataService: MetadataService,
    applicationService: ApplicationService,
  ) {
    super(prisma.compliance, prisma, metadataService, applicationService);
  }

  async create(createDto): Promise<Compliance> {
    // Check if a compliance already exists for this application
    const applicationId = createDto.application.connect.id;
    if (applicationId) {
      const existingCompliance = await this.findByApplicationId(applicationId);
      if (existingCompliance) {
        throw new ConflictException("A compliance already exists for this application");
      }
    }
    return super.create(createDto);
  }

  async findByApplicationId(applicationId: string): Promise<Compliance | null> {
    return this.model.findFirst({ where: { applicationId } });
  }
}
