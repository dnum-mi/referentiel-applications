import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { MetadatasService } from "src/metadatas/metadatas.service";
import { PrismaService } from "src/prisma/prisma.service";
import { BaseService } from "../common/base.service";
import { ServiceOptions } from "../common/utils/types";
import { Label } from "./entities/label.entity";

@Injectable()
export class LabelsService extends BaseService<Label> {
  constructor(prisma: PrismaService, metadataService: MetadatasService) {
    super(prisma.label, prisma, metadataService);
  }

  // Scoping (#2367) : le nom alternatif doit appartenir à l'application de la route, sinon un
  // AppWrite sur A donnait accès en écriture au label (et à sa suppression) de n'importe quelle
  // autre application dont on connaît l'id.
  private async assertBelongsToApplication(id: string, applicationId: string) {
    const label = await this.findOne(id);
    if (label.applicationId !== applicationId) {
      throw new NotFoundException("Nom alternatif introuvable");
    }
  }

  async update(
    id: string,
    data: Prisma.LabelUpdateInput,
    options: ServiceOptions<Label> & { applicationId: string },
  ) {
    await this.assertBelongsToApplication(id, options.applicationId);
    return super.update(id, data, options);
  }

  async delete(
    id: string,
    options: ServiceOptions<Label> & { applicationId: string },
  ) {
    await this.assertBelongsToApplication(id, options.applicationId);
    return super.delete(id, options);
  }

  /**
   * Récupère tous les labels de l'application triés par date de création décroissante.
   * @param applicationId L'ID de l'application pour laquelle récupérer les labels.
   * @returns Un tableau de labels triés.
   */
  async findAllSorted(applicationId: string) {
    const labels = await this.prisma.label.findMany({
      where: { applicationId },
      include: {
        metadatas: {
          orderBy: { createdAt: "desc" },
        },
        labelSource: true,
      },
    });

    return labels.sort((a, b) => {
      const aDate = a.metadatas?.[0]?.createdAt?.getTime() ?? 0;
      const bDate = b.metadatas?.[0]?.createdAt?.getTime() ?? 0;
      return bDate - aDate;
    });
  }

  /**
   * Récupère le label principal (plus récent) d'une application.
   * @param applicationId L'ID de l'application concernée.
   * @returns Le label principal.
   * @throws NotFoundException Si aucun label n'est trouvé.
   */
  async findCurrentLabel(applicationId: string) {
    const labels = await this.prisma.label.findMany({
      where: { applicationId },
      include: {
        metadatas: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        labelSource: true,
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
