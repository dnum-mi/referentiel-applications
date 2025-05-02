import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseService } from 'src/common/base.service';
import { HostingSite } from './entities/hosting-site.entity';

@Injectable()
export class HostingSiteService extends BaseService<HostingSite> {
  constructor(prisma: PrismaService) {
    super(prisma.hostingSite);
  }
}
