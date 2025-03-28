import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseService } from '../common/base.service';
import { MetadatasService } from '../metadatas/metadatas.service';
import { Label } from './entities/label.entity';

@Injectable()
export class LabelsService extends BaseService<Label> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.label);
  }

  /**
   * Récupère tous les labels de l'application triés par date de création décroissante.
   * @param applicationId L'ID de l'application pour laquelle récupérer les labels.
   * @returns Un tableau de labels triés.
   */
  async findAllSorted(applicationId: string) {
    return await this.prisma.label.findMany({
      where: { applicationId },
      include: { metadata: true },
      orderBy: {
        metadata: { updatedAt: 'desc' },
      },
    });
  }

  /**
   * Récupère le label principal d'une application.
   * Priorité :
   * 1. Le label le plus récent avec la source "https://referentiel-applications.interieur.rie.gouv.fr/applications".
   * 2. Sinon, le label le plus récent tout court.
   * @param applicationId L'ID de l'application concernée.
   * @returns Le label principal.
   * @throws NotFoundException Si aucun label n'est trouvé.
   */
  async findCurrentLabel(applicationId: string) {
    let currentLabel = await this.prisma.label.findFirst({
      where: { applicationId },
      include: { metadata: true },
      orderBy: {
        metadata: { updatedAt: 'desc' },
      },
    });

    if (!currentLabel) {
      throw new NotFoundException(
        `Aucun label trouvé pour l'application ${applicationId}.`,
      );
    }

    return currentLabel;
  }
}
