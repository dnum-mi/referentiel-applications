import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseService } from '../common/base.service';
import { Compliance } from './entities/compliance.entity';

@Injectable()
export class CompliancesService extends BaseService<Compliance> {
  constructor(prisma: PrismaService) {
    super(prisma.compliance, prisma);
  }
}
