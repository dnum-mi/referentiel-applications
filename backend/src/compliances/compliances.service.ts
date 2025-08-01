import { Injectable } from "@nestjs/common";
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

  async findByApplicationId(applicationId: string): Promise<Compliance | null> {
    return this.model.findFirst({ where: { applicationId } });
  }
}
