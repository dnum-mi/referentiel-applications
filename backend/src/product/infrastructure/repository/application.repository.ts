import { applicationMap } from '../../application/map/application.map';
import { IApplicationRepository } from './application.repository.interface';

import { Injectable } from '@nestjs/common';
import { CreateApplicationDto } from '../../application/dto/create-application.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ApplicationRepository implements IApplicationRepository {
  constructor(private prisma: PrismaService) {}

  public async create(
    application: CreateApplicationDto,
    applicationMetadataId: string,
    ownerId: string,
  ) {
    const mappedData = applicationMap(
      application,
      applicationMetadataId,
      ownerId,
    );
    return await this.prisma.application.create(mappedData);
  }

  public async findAll() {
    const applications = await this.prisma.application.findMany({
      include: {
        labels: {
          include: {
            metadata: {
              select: {
                createdAt: true, // Sélectionne uniquement createdAt
              },
            },
          }, // Inclure les métadonnées pour le tri
        },
        actors: true,
        relationsAsSource: { include: { targetApplication: true } },
        relationsAsTarget: { include: { sourceApplication: true } },
      },
    });

    // Appliquer le tri des labels après récupération
    return applications.map((app) => ({
      ...app,
      labels: [
        // Priorité aux labels avec la source spécifique
        ...app.labels
          .filter(
            (label) =>
              label.source ===
              'https://referentiel-applications.interieur.rie.gouv.fr/applications',
          )
          .sort(
            (a, b) =>
              new Date(b.metadata.createdAt).getTime() -
              new Date(a.metadata.createdAt).getTime(),
          ),
        // Ensuite les autres labels
        ...app.labels
          .filter(
            (label) =>
              label.source !==
              'https://referentiel-applications.interieur.rie.gouv.fr/applications',
          )
          .sort(
            (a, b) =>
              new Date(b.metadata.createdAt).getTime() -
              new Date(a.metadata.createdAt).getTime(),
          ),
      ],
    }));
  }

  public async findById(id: string) {
    const app = await this.prisma.application.findUnique({
      where: { id },
      include: {
        labels: {
          include: {
            metadata: {
              select: {
                createdAt: true, // Sélectionne uniquement createdAt
              },
            },
          }, // Inclure les métadonnées pour le tri
        },
        actors: true,
        relationsAsSource: {
          include: { targetApplication: { select: { id: true } } },
        },
        relationsAsTarget: {
          include: { sourceApplication: { select: { id: true } } },
        },
      },
    });

    if (!app) return null;

    return {
      ...app,
      labels: [
        ...app.labels
          .filter(
            (label) =>
              label.source ===
              'https://referentiel-applications.interieur.rie.gouv.fr/applications',
          )
          .sort(
            (a, b) =>
              new Date(b.metadata.createdAt).getTime() -
              new Date(a.metadata.createdAt).getTime(),
          ),
        ...app.labels
          .filter(
            (label) =>
              label.source !==
              'https://referentiel-applications.interieur.rie.gouv.fr/applications',
          )
          .sort(
            (a, b) =>
              new Date(b.metadata.createdAt).getTime() -
              new Date(a.metadata.createdAt).getTime(),
          ),
      ],
    };
  }
}
