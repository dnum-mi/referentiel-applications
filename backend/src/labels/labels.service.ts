import { Injectable, NotFoundException } from '@nestjs/common';
import prisma from 'src/prisma/prisma.service';
import { BaseService } from '../common/base.service';
import { Label } from './entities/label.entity';
import { MetadatasService } from 'src/metadatas/metadatas.service';

@Injectable()
export class LabelsService extends BaseService<Label> {
  constructor(metadatasService: MetadatasService) {
    super(prisma.label, prisma, metadatasService);
  }

  /**
   * Récupère tous les labels de l'application triés par date de création décroissante.
   * @param applicationId L'ID de l'application pour laquelle récupérer les labels.
   * @returns Un tableau de labels triés.
   */
  async findAllSorted(applicationId: string) {
    const labels = await prisma.label.findMany({
      where: { applicationId },
      include: {
        metadatas: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return labels.sort((a, b) => {
      const aDate = a.metadatas?.[0]?.createdAt?.getTime() ?? 0;
      const bDate = b.metadatas?.[0]?.createdAt?.getTime() ?? 0;
      return bDate - aDate;
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
    const labels = await prisma.label.findMany({
      where: { applicationId },
      include: {
        metadatas: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!labels.length) {
      throw new NotFoundException(
        `Aucun label trouvé pour l'application ${applicationId}.`,
      );
    }

    return labels[0];
  }
}
