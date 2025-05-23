import { PrismaService } from 'src/prisma/prisma.service';
import { BaseService } from '../common/base.service';
import { Injectable } from '@nestjs/common';
import { Metadata } from '@prisma/client';

@Injectable()
export class MetadatasService extends BaseService<Metadata> {
  constructor(prisma: PrismaService) {
    super(prisma.metadata, prisma);
  }

  /**
   * Créer la metadata liée à une application qui sera ensuite relié à une entité.
   * @param applicationId - L'ID de l'application
   * @param ownerId - L'ID de l'utilisateur qui créer
   */
  async createApplicationMetadata(applicationId: string, ownerId: string) {
    const applicationMetadata = await this.prisma.metadata.create({
      data: {
        applicationId: applicationId,
        createdById: ownerId,
        updatedById: ownerId,
        createdAt: new Date(),
      },
    });

    return applicationMetadata;
  }

  /**
   * Met à jour la metadata de création (la plus ancienne) lorsque l'on modifie
   * les informations générales liées à une application.
   * @param applicationId - L'ID de l'application
   * @param updatedById - L'ID de l'utilisateur qui met à jour
   */
  async updateOldestMetadataForApplication(
    applicationId: string,
    updatedById: string,
  ): Promise<void> {
    const oldestMetadata = await this.prisma.metadata.findFirst({
      where: { applicationId },
      orderBy: { createdAt: 'asc' },
    });

    if (!oldestMetadata) return;

    await this.prisma.metadata.update({
      where: { id: oldestMetadata.id },
      data: {
        updatedById,
        updatedAt: new Date(),
      },
    });
  }
}
