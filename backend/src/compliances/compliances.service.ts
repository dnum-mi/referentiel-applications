import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseService } from '../common/base.service';
import { Compliance } from './entities/compliance.entity';
import { MetadatasService } from 'src/metadatas/metadatas.service';

@Injectable()
export class CompliancesService extends BaseService<Compliance> {
  constructor(prisma: PrismaService, metadatasService: MetadatasService) {
    super(prisma.compliance, prisma, metadatasService);
  }
}
