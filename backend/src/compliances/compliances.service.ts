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

  public async deleteCompliance(id: string, ownerId: string) {
    const deletedCompliance = await this.prisma.compliance.findFirst({
      where: { id },
      select: { applicationId: true, name: true },
    });

    await this.prisma.compliance.delete({ where: { id } });


    await this.prisma.metadata.create({
      data: {
        action: 'delete',
        applicationId: deletedCompliance.applicationId,
        description: 'Suppression de la conformité : ' + deletedCompliance.name,
        createdById: ownerId,
      },
    });
  }
}
