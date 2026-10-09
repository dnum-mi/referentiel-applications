import { ConflictException, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { GristClient } from "./grist.client";
import { GristRecordDto } from "./dto/grist-record.dto";
import { GristSyncReportDto } from "./dto/grist-sync-report.dto";

export const GRIST_TABLE_ID = "RefApp";
/// Clé de l'upsert = Application.id. Grist réserve la colonne `id` (son rowId interne).
const KEY_COLUMN = "refapp_id";
/// Écrites par RefApp, en lecture seule pour les utilisateurs de Grist.
const LOCKED_COLUMNS = [KEY_COLUMN, "nom", "statut"] as const;
/// Saisies par les utilisateurs dans Grist, jamais écrites par la synchronisation.
const METADATA_COLUMNS = ["metadata_1", "metadata_2", "metadata_3"] as const;
/// Les propriétaires du document sont exemptés, sinon la clé de RefApp ne pourrait plus écrire.
const ACL_FORMULA = "user.Access != OWNER";
const BATCH_SIZE = 500;

type GristRecords<T> = { records: { id: number; fields: T }[] };

@Injectable()
export class GristService {
  constructor(
    private readonly grist: GristClient,
    private readonly prisma: PrismaService,
  ) {}

  /// Crée la table si besoin, écrit toutes les applications par upsert sur refapp_id
  /// (rowId et métadonnées conservés), puis vérifie les Access Rules. Rejouable sans effet de bord.
  async setup(): Promise<GristSyncReportDto> {
    const tableCreated = await this.ensureTable();
    // Avant l'upsert : une règle sans exemption des propriétaires bloque l'écriture (403).
    await this.removeForeignRules();

    const applications = await this.prisma.application.findMany({
      select: {
        id: true,
        label: true,
        currentStatus: { select: { status: true } },
      },
      orderBy: { label: "asc" },
    });
    for (let i = 0; i < applications.length; i += BATCH_SIZE) {
      await this.grist.request(`/tables/${GRIST_TABLE_ID}/records`, {
        method: "PUT",
        body: {
          records: applications.slice(i, i + BATCH_SIZE).map((app) => ({
            require: { [KEY_COLUMN]: app.id },
            fields: { nom: app.label, statut: app.currentStatus?.status ?? "" },
          })),
        },
      });
    }

    const rulesAdded =
      Number(await this.addRule(LOCKED_COLUMNS.join(","), "-U")) +
      Number(await this.addRule("*", "-CD"));

    return { tableCreated, rowsWritten: applications.length, rulesAdded };
  }

  async records(): Promise<GristRecordDto[]> {
    const { records } = await this.grist.request<
      GristRecords<Omit<GristRecordDto, "rowId">>
    >(`/tables/${GRIST_TABLE_ID}/records`);
    return records.map(({ id, fields }) => ({ rowId: id, ...fields }));
  }

  private async ensureTable(): Promise<boolean> {
    const { tables } = await this.grist.request<{ tables: { id: string }[] }>(
      "/tables",
    );
    if (tables.some((table) => table.id === GRIST_TABLE_ID)) {
      // Sans refapp_id, l'upsert recréerait toutes les lignes et détacherait les métadonnées.
      const { columns } = await this.grist.request<{
        columns: { id: string }[];
      }>(`/tables/${GRIST_TABLE_ID}/columns`);
      if (!columns.some((column) => column.id === KEY_COLUMN)) {
        throw new ConflictException(
          `La table Grist ${GRIST_TABLE_ID} n'a pas de colonne ${KEY_COLUMN}.`,
        );
      }
      return false;
    }

    // Grist renommerait la table (RefApp2…) si l'id existait déjà, d'où la vérification au-dessus.
    await this.grist.request("/tables", {
      method: "POST",
      body: {
        tables: [
          {
            id: GRIST_TABLE_ID,
            columns: [
              ...LOCKED_COLUMNS.map((id) => ({ id, label: id })),
              ...METADATA_COLUMNS.map((id) => ({
                id,
                label: id.replace("_", " "),
              })),
            ].map(({ id, label }) => ({ id, fields: { label, type: "Text" } })),
          },
        ],
      },
    });
    return true;
  }

  /// Supprime les règles de la table qui n'ont pas notre condition (règles posées à la main
  /// dans Grist, ou par une version précédente) : elles s'appliqueraient aussi à la clé de RefApp.
  private async removeForeignRules(): Promise<void> {
    const { records } = await this.grist.request<GristRecords<{ id: number }>>(
      "/sql",
      {
        method: "POST",
        body: {
          sql: `SELECT r.id FROM _grist_ACLRules r
                JOIN _grist_ACLResources s ON s.id = r.resource
                WHERE s.tableId = ? AND r.aclFormula != ?`,
          args: [GRIST_TABLE_ID, ACL_FORMULA],
        },
      },
    );
    if (!records.length) return;
    await this.grist.request("/apply", {
      method: "POST",
      body: [
        [
          "BulkRemoveRecord",
          "_grist_ACLRules",
          records.map(({ fields }) => fields.id),
        ],
      ],
    });
  }

  /// Une règle = une ressource (table + colonnes) dans _grist_ACLResources et une règle
  /// qui la référence dans _grist_ACLRules. Grist garde les ressources d'une table supprimée
  /// et refuse les doublons : on réutilise donc la ressource et la règle existantes.
  private async addRule(
    colIds: string,
    permissionsText: string,
  ): Promise<boolean> {
    const sql = <T>(query: string, args: unknown[]) =>
      this.grist.request<GristRecords<T>>("/sql", {
        method: "POST",
        body: { sql: query, args },
      });
    const apply = (actions: unknown[]) =>
      this.grist.request<{ retValues: number[] }>("/apply", {
        method: "POST",
        body: actions,
      });

    const { records: resources } = await sql<{ id: number }>(
      "SELECT id FROM _grist_ACLResources WHERE tableId = ? AND colIds = ?",
      [GRIST_TABLE_ID, colIds],
    );
    let resource = resources[0]?.fields.id;
    if (!resource) {
      ({
        retValues: [resource],
      } = await apply([
        [
          "AddRecord",
          "_grist_ACLResources",
          null,
          { tableId: GRIST_TABLE_ID, colIds },
        ],
      ]));
    }

    const { records: rules } = await sql<{ id: number }>(
      "SELECT id FROM _grist_ACLRules WHERE resource = ? AND aclFormula = ? AND permissionsText = ?",
      [resource, ACL_FORMULA, permissionsText],
    );
    if (rules.length) return false;
    await apply([
      [
        "AddRecord",
        "_grist_ACLRules",
        null,
        { resource, aclFormula: ACL_FORMULA, permissionsText, rulePos: 1 },
      ],
    ]);
    return true;
  }
}
