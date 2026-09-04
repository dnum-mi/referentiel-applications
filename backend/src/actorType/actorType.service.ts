import { BadRequestException, Injectable } from "@nestjs/common";
import { ActorType, AppPermissions } from "@prisma/client";
import { BaseService } from "src/common/base.service";
import { PaginatedResponseDto } from "src/common/dto";
import { PrismaService } from "src/prisma/prisma.service";
import { ActorTypeFiltersDto } from "./dto/actor-type-filters.dto";
import { AppPermsMatrixHistoryDto } from "./dto/app-perms-matrix-history.dto";
import { AppPermsDto } from "./dto/app-perms-matrix.dto";
import { CreateActorTypeDto } from "./dto/actorType.dto";

// Aucun droit par défaut : un nouveau type d'acteur démarre sans accès, à ouvrir explicitement
// depuis la matrice des permissions. Seuls les champs sans `@default` en base sont listés ici ;
// les autres (DataRead, TechnologyRead, ReportPost, ...) reprennent leur défaut du schema Prisma.
const DEFAULT_APP_PERMISSIONS = {
  AppRead: false,
  AppWrite: false,
  ActorRead: false,
  ActorWrite: false,
  ComplianceRead: false,
  ComplianceWrite: false,
  HostingRead: false,
  HostingWrite: false,
  MetadataRead: false,
  RelationRead: false,
  RelationWrite: false,
  LinkRead: false,
  LinkWrite: false,
} as const;

// Préfixe utilisé pour retrouver, parmi les entrées Metadata (globales, sans applicationId),
// celles qui journalisent une modification de la matrice des droits.
const MATRIX_HISTORY_DESCRIPTION_PREFIX =
  "Modification de la matrice des droits";

// Le libellé du type d'acteur est une donnée admin (éditable librement) : on l'échappe avant de
// l'insérer dans une description affichée en `<b>` (rendue en v-html côté front) pour éviter
// toute injection HTML depuis ce champ.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Libellés des lignes d'historique, dans l'ordre d'affichage de la matrice (= ordre des
// onglets de la fiche, #2083).
const PERM_FIELDS: Record<string, string> = {
  AppRead: "Informations - Lecture",
  AppWrite: "Informations - Écriture",
  AppWritePriority: "Prioritisation et redémarrage",
  HostingRead: "Hébergements - Lecture",
  HostingWrite: "Hébergements - Écriture",
  LinkRead: "Liens - Lecture",
  LinkWrite: "Liens - Écriture",
  ComplianceRead: "Conformités - Lecture",
  ComplianceWrite: "Conformités - Écriture",
  ActorRead: "Acteurs - Lecture",
  ActorWrite: "Acteurs - Écriture",
  TechnologyRead: "Technologie - Lecture",
  TechnologyWrite: "Technologie - Écriture",
  RelationRead: "Relations - Lecture",
  RelationWrite: "Relations - Écriture",
  DataRead: "Données - Lecture",
  DataWrite: "Données - Écriture",
  ReportRead: "Signalements - Lecture",
  ReportPost: "Signalements - Publication",
  ReportManage: "Signalements - Gestion",
  MetadataRead: "Historique - Lecture",
};

@Injectable()
export class ActorTypeService extends BaseService<ActorType> {
  constructor(prisma: PrismaService) {
    super(prisma.actorType, prisma);
  }

  // Surcharge de BaseService.findAll : exclut par défaut le type d'acteur système (isDefault),
  // non assignable à un acteur réel (cf. `includeSystem`, utilisé par la matrice des permissions
  // qui a besoin de tous les types, système compris, pour résoudre les libellés des lignes).
  public async findAll({
    includeSystem,
    ...pagination
  }: ActorTypeFiltersDto): Promise<PaginatedResponseDto<ActorType>> {
    return super.findAll({
      ...pagination,
      where: includeSystem ? {} : { isDefault: false },
    });
  }

  // Surcharge de BaseService.create : crée aussi la ligne AppPermissions associée (relation 1:1)
  // pour que le nouveau type d'acteur apparaisse immédiatement dans la matrice des permissions.
  public async create(data: CreateActorTypeDto): Promise<ActorType> {
    return this.prisma.actorType.create({
      data: {
        ...data,
        appPermissions: { create: DEFAULT_APP_PERMISSIONS },
      },
    });
  }

  // Surcharge de BaseService.delete : protège le type d'acteur système (isDefault) requis par
  // le fallback non-acteur de CheckPermissions.getUserAppPermissions.
  public async delete(id: string): Promise<ActorType> {
    const actorType = await this.findOne(id);
    if (actorType.isDefault) {
      throw new BadRequestException(
        "Impossible de supprimer le type d'acteur par défaut (utilisé comme fallback pour les utilisateurs non-acteurs).",
      );
    }
    return super.delete(id);
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

    // Écritures groupées dans une transaction (#2440) : appliquées une par une auparavant, un
    // échec en cours de boucle (contrainte, timeout…) laissait la matrice des droits partiellement
    // mise à jour sans rollback ni indication claire de ce qui avait réellement été écrit.
    await this.prisma.$transaction(
      matrix.map((perm) =>
        this.prisma.appPermissions.update({
          where: { actorTypeId: perm.actorTypeId },
          data: perm as AppPermissions,
        }),
      ),
    );

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
          `<b>Type d'acteur ${escapeHtml(label)} :</b>\n${permChanges.map((c) => `\t• ${c}`).join("\n")}`,
        );
      }
    }

    if (changeLines.length > 0) {
      await this.prisma.metadata.create({
        data: {
          createdById: requestorId,
          action: "update",
          description: [MATRIX_HISTORY_DESCRIPTION_PREFIX, ...changeLines].join(
            "\n",
          ),
        },
      });
    }

    return this.getPermsMatrix();
  }

  public async getPermsMatrixHistory(): Promise<AppPermsMatrixHistoryDto[]> {
    const logs = await this.prisma.metadata.findMany({
      where: {
        applicationId: null,
        action: "update",
        description: { startsWith: MATRIX_HISTORY_DESCRIPTION_PREFIX },
      },
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { email: true } } },
    });

    return logs.map((log) => ({
      id: log.id,
      createdAt: log.createdAt,
      // Compat entrées existantes : avant ce fix la mise en avant était en markdown (`**texte**`),
      // remplacé depuis par du <b> directement (rendu en v-html côté front, cf. AppPermsMatrixHistory).
      description: (log.description ?? "").replace(
        /\*\*(.+?)\*\*/g,
        "<b>$1</b>",
      ),
      changedByEmail: log.createdBy?.email ?? null,
    }));
  }
}
