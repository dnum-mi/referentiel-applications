import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ApplicationSearchDto } from "src/applications/dto/search-application.dto";
import { ApplicationExportService } from "src/applications/export.service";
import { PrismaService } from "src/prisma/prisma.service";
import { Requestor } from "src/user/entities/user.entity";
import { decryptGristApiKey } from "./grist-api-key";
import { GristClient, GristDocument, GristRequest } from "./grist.client";
import { GristRecordDto } from "./dto/grist-record.dto";
import {
  GRIST_TABLE_ID_PATTERN,
  GristDocumentTablesDto,
  GristSyncTargetDto,
} from "./dto/grist-sync.dto";
import {
  GristDocumentReportDto,
  GristSyncReportDto,
} from "./dto/grist-sync-report.dto";

/// Table synchronisée : RefApp, ou RefApp2, RefApp3… si une table RefApp étrangère existe déjà.
export const GRIST_TABLE_PREFIX = "RefApp";
/// Clé de l'upsert = Application.id. Grist réserve la colonne `id` (son rowId interne).
const KEY_COLUMN = "refapp_id";
/// Écrites par RefApp, en lecture seule pour les utilisateurs de Grist.
const LOCKED_COLUMNS = {
  [KEY_COLUMN]: "Text",
  nom: "Text",
  statut: "Text",
  /// false : l'application n'est plus dans la sélection synchronisée (ligne grisée).
  dans_selection: "Bool",
  motif_sortie: "Text",
} as const;
/// Saisies par les utilisateurs dans Grist, jamais écrites par la synchronisation.
const METADATA_COLUMNS = ["metadata_1", "metadata_2", "metadata_3"] as const;
/// Formule vide = règle « Everyone » : le verrou s'applique à tous, propriétaires compris. La
/// synchronisation (clé d'un propriétaire) le lève le temps d'écrire, puis le remet.
const ACL_FORMULA = "";
/// Une ressource par règle posée par addRule.
const LOCKED_RESOURCE = Object.keys(LOCKED_COLUMNS).join(",");
const TABLE_RESOURCE = "*";
const GREY_FORMULA = "not $dans_selection";
const GREY_STYLE = { textColor: "#929292", fillColor: "#EEEEEE" };
export const EXIT_REASON = {
  outOfFilter: "hors filtre",
  deleted: "supprimée de RefApp",
} as const;
const BATCH_SIZE = 500;
const MISSING_CONNECTION =
  "Renseignez l'URL de votre instance Grist et votre clé d'API dans votre profil.";

const logger = new Logger("Grist");

type GristRecords<T> = { records: { id: number; fields: T }[] };
/// Table RefApp d'un document : toutes les requêtes de la synchronisation portent sur elle.
type GristTable = {
  tableId: string;
  request: <T>(path: string, options?: GristRequest) => Promise<T>;
};
/// Table visée : `tableId` existante, `newTable` pour en créer une, sinon notre première table
/// (créée si besoin quand `create`).
type TableChoice = Pick<GristSyncTargetDto, "tableId" | "newTable"> & {
  create: boolean;
};
type SelectedApplication = {
  id: string;
  label: string;
  currentStatus: { status: string } | null;
};
type GristRow = Pick<GristRecordDto, "refapp_id" | "motif_sortie"> &
  Partial<Pick<GristRecordDto, (typeof METADATA_COLUMNS)[number]>> & {
    dans_selection: boolean | null;
  };

@Injectable()
export class GristService {
  constructor(
    private readonly grist: GristClient,
    private readonly prisma: PrismaService,
    private readonly applicationExport: ApplicationExportService,
  ) {}

  /// Écrit les applications correspondant aux filtres de recherche dans les tables visées : par
  /// défaut la première table RefApp de chaque document du profil. Les cibles sont traitées l'une
  /// après l'autre et indépendamment : une cible en échec n'empêche pas les suivantes.
  async setup(
    searchParams: ApplicationSearchDto,
    requestor: Requestor,
    requestedTargets?: GristSyncTargetDto[],
  ): Promise<GristSyncReportDto> {
    const { docIds, connection } = await this.profile(requestor);
    if (!connection) {
      throw new BadRequestException(MISSING_CONNECTION);
    }
    if (!docIds.length) {
      throw new BadRequestException("Aucun document Grist dans votre profil.");
    }
    const targets: GristSyncTargetDto[] =
      requestedTargets ?? docIds.map((docId) => ({ docId }));
    for (const target of targets) {
      if (!docIds.includes(target.docId)) {
        throw new ForbiddenException(
          `Le document Grist ${target.docId} n'est pas dans votre profil.`,
        );
      }
      if (target.tableId && target.newTable) {
        throw new BadRequestException(
          "Choisissez une table existante ou une nouvelle table, pas les deux.",
        );
      }
    }

    const where = await this.applicationExport.buildScopedWhere(
      searchParams,
      requestor,
    );
    const applications = where
      ? await this.prisma.application.findMany({
          where,
          select: {
            id: true,
            label: true,
            currentStatus: { select: { status: true } },
          },
          orderBy: { label: "asc" },
        })
      : [];

    const documents: GristDocumentReportDto[] = [];
    for (const { docId, tableId, newTable } of targets) {
      try {
        documents.push(
          await this.syncDocument(
            { ...connection, docId },
            { tableId, newTable, create: true },
            applications,
          ),
        );
      } catch (error) {
        logger.warn(
          `Synchronisation du document ${docId} en échec : ${(error as Error).message}`,
        );
        documents.push({
          docId,
          ...(tableId && { tableId }),
          status: "error",
          error:
            error instanceof HttpException
              ? error.message
              : "Erreur inattendue.",
        });
      }
    }
    return { documents };
  }

  /// Tables écrites par RefApp dans chaque document du profil, pour choisir où synchroniser.
  /// Un document illisible (droits, introuvable…) est signalé sans bloquer les autres.
  async tables(requestor: Requestor): Promise<GristDocumentTablesDto[]> {
    const { docIds, connection } = await this.profile(requestor);
    if (!connection) {
      throw new BadRequestException(MISSING_CONNECTION);
    }
    const documents: GristDocumentTablesDto[] = [];
    for (const docId of docIds) {
      try {
        documents.push({
          docId,
          tables: await this.ownTables({ ...connection, docId }),
        });
      } catch (error) {
        documents.push({
          docId,
          tables: [],
          error:
            error instanceof HttpException
              ? error.message
              : "Erreur inattendue.",
        });
      }
    }
    return documents;
  }

  /// Lit une table RefApp d'un document du profil (par défaut la première), sans la créer.
  async records(
    docId: string,
    requestor: Requestor,
    tableId?: string,
  ): Promise<GristRecordDto[]> {
    const { docIds, connection } = await this.profile(requestor);
    if (!docIds.includes(docId)) {
      throw new ForbiddenException(
        "Ce document Grist n'est pas dans votre profil.",
      );
    }
    if (!connection) {
      throw new BadRequestException(MISSING_CONNECTION);
    }
    const table = await this.resolveTable(
      { ...connection, docId },
      { tableId, create: false },
    );
    if (!table) return [];
    const { records } = await table.request<
      GristRecords<Omit<GristRecordDto, "rowId">>
    >(`/tables/${table.tableId}/records`);
    return records.map(({ id, fields }) => ({ rowId: id, ...fields }));
  }

  /// Relu en base et non depuis le jeton : le profil peut avoir changé depuis la connexion. La clé
  /// d'API est omise par défaut des lignes User (cf. PrismaService), d'où le select explicite.
  private async profile(requestor: Requestor): Promise<{
    docIds: string[];
    connection: Omit<GristDocument, "docId"> | null;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: requestor.id },
      select: { gristDocIds: true, gristUrl: true, gristApiKey: true },
    });
    if (!user?.gristUrl || !user.gristApiKey) {
      return { docIds: user?.gristDocIds ?? [], connection: null };
    }
    const apiKey = decryptGristApiKey(user.gristApiKey);
    if (!apiKey) {
      throw new BadRequestException(
        "Clé d'API Grist illisible : saisissez-la à nouveau dans votre profil.",
      );
    }
    return {
      docIds: user.gristDocIds,
      connection: { url: user.gristUrl, apiKey },
    };
  }

  /// Upsert sur refapp_id (rowId et métadonnées conservés). Les lignes sorties de la sélection
  /// sont grisées si elles portent des métadonnées, supprimées sinon. Rejouable sans effet de bord.
  private async syncDocument(
    document: GristDocument,
    choice: TableChoice,
    applications: SelectedApplication[],
  ): Promise<GristDocumentReportDto> {
    // Les ajouts de colonnes (schéma) ne sont pas concernés par le verrou : seules les écritures
    // de lignes se font déverrouillées. Le verrou est remis même si l'écriture échoue.
    const table = (await this.resolveTable(document, choice))!;
    await this.unlock(table);
    let exited: { rowsGreyed: number; rowsDeleted: number };
    try {
      for (let i = 0; i < applications.length; i += BATCH_SIZE) {
        await table.request(`/tables/${table.tableId}/records`, {
          method: "PUT",
          body: {
            records: applications.slice(i, i + BATCH_SIZE).map((app) => ({
              require: { [KEY_COLUMN]: app.id },
              fields: {
                nom: app.label,
                statut: app.currentStatus?.status ?? "",
                dans_selection: true,
                motif_sortie: "",
              },
            })),
          },
        });
      }

      exited = await this.handleExitedRows(
        table,
        new Set(applications.map((app) => app.id)),
      );
      await this.ensureGreyStyle(table);
    } finally {
      await this.lock(table);
    }
    const { rowsGreyed, rowsDeleted } = exited;

    return {
      docId: document.docId,
      status: "ok",
      tableId: table.tableId,
      tableCreated: table.created,
      rowsWritten: applications.length,
      rowsGreyed,
      rowsDeleted,
    };
  }

  /// Nos tables portent la colonne refapp_id : une table RefApp sans cette clé appartient à
  /// quelqu'un d'autre et n'est jamais touchée (l'upsert y recréerait toutes les lignes).
  /// - `tableId` : cette table, qui doit exister et être à nous ;
  /// - `newTable` : la première place libre parmi RefApp, RefApp2… ;
  /// - sinon : notre première table, ou à défaut la première place libre si `create`.
  /// Une table à nous reçoit les colonnes ajoutées depuis sa création si `create`.
  private async resolveTable(
    document: GristDocument,
    { tableId: requested, newTable, create }: TableChoice,
  ): Promise<(GristTable & { created: boolean }) | null> {
    const request: GristTable["request"] = (path, options) =>
      this.grist.request(document, path, options);
    const columns = [
      ...Object.entries(LOCKED_COLUMNS).map(([id, type]) => ({ id, type })),
      ...METADATA_COLUMNS.map((id) => ({ id, type: "Text" })),
    ].map(({ id, type }) => ({
      id,
      fields: { label: id.replace(/_(\d)$/, " $1"), type },
    }));
    const useExisting = async (tableId: string) => {
      const existing = await this.columnIds(request, tableId);
      if (!existing.has(KEY_COLUMN)) return null;
      const missing = columns.filter((column) => !existing.has(column.id));
      if (create && missing.length) {
        await request(`/tables/${tableId}/columns`, {
          method: "POST",
          body: { columns: missing },
        });
      }
      return { tableId, request, created: false };
    };

    const tableIds = await this.tableIds(request);
    if (requested) {
      if (!tableIds.has(requested)) {
        throw new NotFoundException(
          `La table ${requested} n'existe pas dans ce document.`,
        );
      }
      const table = await useExisting(requested);
      if (!table) {
        throw new ConflictException(
          `La table ${requested} n'a pas été créée par RefApp (pas de colonne ${KEY_COLUMN}).`,
        );
      }
      return table;
    }
    for (let rank = 1; ; rank++) {
      const tableId = tableName(rank);
      if (!tableIds.has(tableId)) {
        if (!create) return null;
        await request("/tables", {
          method: "POST",
          body: { tables: [{ id: tableId, columns }] },
        });
        return { tableId, request, created: true };
      }
      if (newTable) continue;
      const table = await useExisting(tableId);
      if (table) return table;
    }
  }

  /// Tables RefApp, RefApp2… du document qui portent refapp_id, dans l'ordre de leur rang.
  private async ownTables(document: GristDocument): Promise<string[]> {
    const request: GristTable["request"] = (path, options) =>
      this.grist.request(document, path, options);
    const candidates = [...(await this.tableIds(request))]
      .filter((id) => GRIST_TABLE_ID_PATTERN.test(id))
      .sort((a, b) => tableRank(a) - tableRank(b));
    const own: string[] = [];
    for (const tableId of candidates) {
      if ((await this.columnIds(request, tableId)).has(KEY_COLUMN)) {
        own.push(tableId);
      }
    }
    return own;
  }

  private async tableIds(request: GristTable["request"]): Promise<Set<string>> {
    const { tables } = await request<{ tables: { id: string }[] }>("/tables");
    return new Set(tables.map((table) => table.id));
  }

  private async columnIds(
    request: GristTable["request"],
    tableId: string,
  ): Promise<Set<string>> {
    const { columns } = await request<{ columns: { id: string }[] }>(
      `/tables/${tableId}/columns`,
    );
    return new Set(columns.map((column) => column.id));
  }

  /// Lignes dont l'application n'est plus dans la sélection : grisées avec leur motif si un
  /// utilisateur y a saisi des métadonnées, supprimées sinon.
  private async handleExitedRows(
    { tableId, request }: GristTable,
    selected: Set<string>,
  ): Promise<{ rowsGreyed: number; rowsDeleted: number }> {
    const { records } = await request<GristRecords<GristRow>>(
      `/tables/${tableId}/records`,
    );
    const exited = records.filter(
      ({ fields }) => !selected.has(fields.refapp_id),
    );
    if (!exited.length) return { rowsGreyed: 0, rowsDeleted: 0 };

    const stillInRefApp = new Set(
      (
        await this.prisma.application.findMany({
          where: { id: { in: exited.map(({ fields }) => fields.refapp_id) } },
          select: { id: true },
        })
      ).map(({ id }) => id),
    );
    const [kept, removed] = partition(exited, ({ fields }) =>
      METADATA_COLUMNS.some((column) => fields[column]?.trim()),
    );

    const changed = kept
      .map(({ id, fields }) => ({
        id,
        current: fields,
        fields: {
          dans_selection: false,
          motif_sortie: stillInRefApp.has(fields.refapp_id)
            ? EXIT_REASON.outOfFilter
            : EXIT_REASON.deleted,
        },
      }))
      .filter(
        ({ current, fields }) =>
          current.dans_selection !== false ||
          current.motif_sortie !== fields.motif_sortie,
      )
      .map(({ id, fields }) => ({ id, fields }));
    for (let i = 0; i < changed.length; i += BATCH_SIZE) {
      await request(`/tables/${tableId}/records`, {
        method: "PATCH",
        body: { records: changed.slice(i, i + BATCH_SIZE) },
      });
    }
    if (removed.length) {
      await request("/apply", {
        method: "POST",
        body: [["BulkRemoveRecord", tableId, removed.map(({ id }) => id)]],
      });
    }
    return { rowsGreyed: kept.length, rowsDeleted: removed.length };
  }

  /// Grise toutes les colonnes d'une ligne hors sélection. Le style conditionnel Grist est porté
  /// par une colonne helper (formule) référencée dans `rules`, et son style par l'entrée de même
  /// rang dans widgetOptions.rulesOptions. Une colonne déjà grisée n'est pas modifiée.
  private async ensureGreyStyle({
    tableId,
    request,
  }: GristTable): Promise<void> {
    const { records } = await request<
      GristRecords<{
        id: number;
        colId: string;
        rules: string | null;
        formula: string;
        widgetOptions: string;
      }>
    >("/sql", {
      method: "POST",
      body: {
        sql: `SELECT c.id, c.colId, c.rules, c.formula, c.widgetOptions
              FROM _grist_Tables_column c JOIN _grist_Tables t ON t.id = c.parentId
              WHERE t.tableId = ?`,
        args: [tableId],
      },
    });
    const columns = records.map(({ fields }) => ({
      ...fields,
      rules: JSON.parse(fields.rules || "[]") as number[],
    }));
    const formulaOf = new Map(columns.map((c) => [c.id, c.formula]));
    const toStyle = columns.filter(
      (c) =>
        c.colId !== "manualSort" &&
        !c.colId.startsWith("gristHelper_") &&
        !c.rules.some((rule) => formulaOf.get(rule) === GREY_FORMULA),
    );
    if (!toStyle.length) return;

    const { retValues } = await request<{
      retValues: { colRef: number }[];
    }>("/apply", {
      method: "POST",
      body: toStyle.map((c) => ["AddEmptyRule", tableId, 0, c.id]),
    });
    await request("/apply", {
      method: "POST",
      body: toStyle.flatMap((c, i) => {
        const options = JSON.parse(c.widgetOptions || "{}") as {
          rulesOptions?: object[];
        };
        const rulesOptions = Array.from(
          { length: c.rules.length },
          (_, rank) => options.rulesOptions?.[rank] ?? {},
        );
        return [
          [
            "UpdateRecord",
            "_grist_Tables_column",
            retValues[i].colRef,
            { formula: GREY_FORMULA },
          ],
          [
            "UpdateRecord",
            "_grist_Tables_column",
            c.id,
            {
              widgetOptions: JSON.stringify({
                ...options,
                rulesOptions: [...rulesOptions, GREY_STYLE],
              }),
            },
          ],
        ];
      }),
    });
  }

  /// Retire toutes les règles de la table, y compris celles posées à la main dans Grist ou par
  /// une version précédente (exemption des propriétaires) : lock() repose ensuite les nôtres.
  /// Retire aussi les règles des tables supprimées : Grist les garde, puis refuse toute
  /// modification des règles du document (« Invalid tables in rules »).
  /// Les ressources spéciales (tableId « * », « *SPECIAL ») et la ligne vide sont épargnées.
  private async unlock({ tableId, request }: GristTable): Promise<void> {
    const { records } = await request<GristRecords<{ id: number }>>("/sql", {
      method: "POST",
      body: {
        sql: `SELECT r.id FROM _grist_ACLRules r
                JOIN _grist_ACLResources s ON s.id = r.resource
                WHERE s.tableId = ?
                   OR (s.tableId != '' AND s.tableId NOT LIKE '*%'
                       AND s.tableId NOT IN (SELECT tableId FROM _grist_Tables))`,
        args: [tableId],
      },
    });
    if (!records.length) return;
    await request("/apply", {
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

  private async lock(table: GristTable): Promise<void> {
    await this.addRule(table, LOCKED_RESOURCE, "-U");
    await this.addRule(table, TABLE_RESOURCE, "-CD");
  }

  /// Une règle = une ressource (table + colonnes) dans _grist_ACLResources et une règle
  /// qui la référence dans _grist_ACLRules. Grist garde les ressources d'une table supprimée
  /// et refuse les doublons : on réutilise donc la ressource existante.
  private async addRule(
    { tableId, request }: GristTable,
    colIds: string,
    permissionsText: string,
  ): Promise<void> {
    const apply = (actions: unknown[]) =>
      request<{ retValues: number[] }>("/apply", {
        method: "POST",
        body: actions,
      });

    const { records: resources } = await request<GristRecords<{ id: number }>>(
      "/sql",
      {
        method: "POST",
        body: {
          sql: "SELECT id FROM _grist_ACLResources WHERE tableId = ? AND colIds = ?",
          args: [tableId, colIds],
        },
      },
    );
    let resource = resources[0]?.fields.id;
    if (!resource) {
      ({
        retValues: [resource],
      } = await apply([
        ["AddRecord", "_grist_ACLResources", null, { tableId, colIds }],
      ]));
    }
    await apply([
      [
        "AddRecord",
        "_grist_ACLRules",
        null,
        { resource, aclFormula: ACL_FORMULA, permissionsText, rulePos: 1 },
      ],
    ]);
  }
}

function tableName(rank: number): string {
  return rank === 1 ? GRIST_TABLE_PREFIX : `${GRIST_TABLE_PREFIX}${rank}`;
}

function tableRank(tableId: string): number {
  return Number(tableId.slice(GRIST_TABLE_PREFIX.length) || 1);
}

function partition<T>(items: T[], predicate: (item: T) => boolean): [T[], T[]] {
  const yes: T[] = [];
  const no: T[] = [];
  for (const item of items) (predicate(item) ? yes : no).push(item);
  return [yes, no];
}
