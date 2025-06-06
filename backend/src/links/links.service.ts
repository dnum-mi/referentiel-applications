import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseService } from '../common/base.service';
import { Link } from './entities/link.entity';

@Injectable()
export class LinksService extends BaseService<Link> {
  constructor(prisma: PrismaService) {
    super(prisma.externalRessource, prisma);
  }

  public async deleteLink(id: string, ownerId: string) {
    const deletedLink = await this.prisma.externalRessource.findFirst({
      where: { id },
      select: { applicationId: true, link: true },
    });

    await this.prisma.metadata.create({
      data: {
        action: 'delete',
        applicationId: deletedLink.applicationId,
        description: 'Suppression du lien : ' + deletedLink.link,
        createdById: ownerId,
      },
    });

    await this.prisma.externalRessource.delete({ where: { id } });
  }
}
