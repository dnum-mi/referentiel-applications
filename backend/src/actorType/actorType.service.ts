import { Injectable } from "@nestjs/common";
import { ActorType, AppPermissions } from "@prisma/client";
import { BaseService } from "src/common/base.service";
import { PrismaService } from "src/prisma/prisma.service";
import { AppPermsDto } from "./dto/app-perms-matrix.dto";

const PERM_FIELDS: Record<string, string> = {
  AppRead: "Informations - Lecture",
  AppWrite: "Informations - Écriture",
  AppWritePriority: "Prioritisation et redémarrage",
  ActorRead: "Acteurs - Lecture",
  ActorWrite: "Acteurs - Écriture",
  ComplianceRead: "Conformités - Lecture",
  ComplianceWrite: "Conformités - Écriture",
  HostingRead: "Hébergements - Lecture",
  HostingWrite: "Hébergements - Écriture",
  MetadataRead: "Historique - Lecture",
  RelationRead: "Relations - Lecture",
  RelationWrite: "Relations - Écriture",
  LinkRead: "Liens - Lecture",
  LinkWrite: "Liens - Écriture",
  ReportRead: "Signalements - Lecture",
  ReportPost: "Signalements - Publication",
  ReportManage: "Signalements - Gestion",
};

@Injectable()
export class ActorTypeService extends BaseService<ActorType> {
  constructor(prisma: PrismaService) {
    super(prisma.actorType, prisma);
  }

  public async getPermsMatrix(): Promise<AppPermissions[]> {
    return this.prisma.appPermissions.findMany();
  }

  public async updatePermsMatrix(
    matrix: AppPermsDto[],
    requestorId: string,
  ): Promise<AppPermissions[]> {
    const oldMatrix = await this.getPermsMatrix();
    const actorTypes = await this.prisma.actorType.findMany();
    const actorTypeMap = new Map(actorTypes.map((at) => [at.id, at]));

    for (const perm of matrix) {
      await this.prisma.appPermissions.update({
        where: { actorTypeId: perm.actorTypeId },
        data: perm as AppPermissions,
      });
    }

    const changeLines: string[] = [];
    for (const perm of matrix) {
      const oldPerm = oldMatrix.find((p) => p.actorTypeId === perm.actorTypeId);
      if (!oldPerm) continue;

      const actorType = actorTypeMap.get(perm.actorTypeId);
      const label = actorType?.label ?? perm.actorTypeId;

      const permChanges: string[] = [];
      for (const [field, fieldLabel] of Object.entries(PERM_FIELDS)) {
        const oldVal = oldPerm[field as keyof AppPermissions] as boolean;
        const newVal = perm[field as keyof AppPermsDto] as boolean;
        if (oldVal !== newVal) {
          permChanges.push(
            `${fieldLabel}: ${oldVal ? "Oui" : "Non"} → ${newVal ? "Oui" : "Non"}`,
          );
        }
      }

      if (permChanges.length > 0) {
        changeLines.push(
          `**Type d'acteur ${label} :**\n${permChanges.map((c) => `\t• ${c}`).join("\n")}`,
        );
      }
    }

    if (changeLines.length > 0) {
      await this.prisma.metadata.create({
        data: {
          createdById: requestorId,
          action: "update",
          description: [
            "Modification de la matrice des droits",
            ...changeLines,
          ].join("\n"),
        },
      });
    }

    return this.getPermsMatrix();
  }
}
