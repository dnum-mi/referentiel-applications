import { Injectable } from '@nestjs/common';
import { Organization } from '@prisma/client';
import { BaseService } from '../common/base.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class OrganizationService extends BaseService<Organization> {
  constructor(prisma: PrismaService) {
    super(prisma.organization, prisma);
  }

  async delete(id: string): Promise<Organization> {
    await this.findOne(id);
    return this.prisma.organization.delete({ where: { id } });
  }
}
