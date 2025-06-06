import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseService } from '../common/base.service';
import { Compliance } from './entities/compliance.entity';

@Injectable()
export class CompliancesService extends BaseService<Compliance> {
  constructor(prisma: PrismaService) {
    super(prisma.compliance, prisma);
  }

  public async deleteCompliance(id: string, ownerId: string) {
    const deletedCompliance = await this.prisma.compliance.findFirst({
      where: { id },
      select: { applicationId: true, name: true },
    });

    await this.prisma.metadata.create({
      data: {
        action: 'delete',
        applicationId: deletedCompliance.applicationId,
        description: 'Suppression de la conformité : ' + deletedCompliance.name,
        createdById: ownerId,
      },
    });

    await this.prisma.compliance.delete({ where: { id } });
  }
}
