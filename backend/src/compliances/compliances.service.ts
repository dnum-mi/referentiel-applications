import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseService } from '../common/base.service';
import { Compliance } from './entities/compliance.entity';
import { MetadatasService } from 'src/metadatas/metadatas.service';
import { ApplicationService } from 'src/product/application.service';

@Injectable()
export class CompliancesService extends BaseService<Compliance> {
  constructor(
    prisma: PrismaService,
    metadatasService: MetadatasService,
    applicationService: ApplicationService,
  ) {
    super(prisma.compliance, prisma, metadatasService, applicationService);
  }

  async findByApplicationId(applicationId: string): Promise<Compliance | null> {
    return this.model.findFirst({ where: { applicationId } });
  }
}
