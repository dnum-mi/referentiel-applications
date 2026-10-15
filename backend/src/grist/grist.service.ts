import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Permission } from "@prisma/client";
import { ApplicationSearchDto } from "src/applications/dto/search-application.dto";
import { ApplicationExportService } from "src/applications/export.service";
import { ApplicationRepository } from "src/applications/infrastructure/repository/application.repository";
import { CheckPermissions } from "src/common/service/check-permissions.service";
import { PrismaService } from "src/prisma/prisma.service";
import { Requestor } from "src/user/entities/user.entity";
import { decryptGristApiKey } from "./grist-api-key";
import {
  DEFAULT_GRIST_COLUMN_FIELDS,
  GRIST_COLUMNS,
  GristApplication,
  GristColumnDefinition,
  REFAPP_COLUMN_IDS,
  SELECTION_COLUMN,
} from "./grist-columns";
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
/// Toujours écrite, avant les colonnes choisies dans la page de recherche.
const KEY_COLUMN = "refapp_id";
/// Colonnes toujours présentes, avant les colonnes choisies : la clé, puis l'appartenance à la
/// sélection (masquée des vues).
const FIXED_DEFINITIONS = [
  {
    id: KEY_COLUMN,
    fields: { label: KEY_COLUMN, type: "Text", untieColIdFromLabel: true },
  },
  {
    id: SELECTION_COLUMN,
    fields: {
      label: "Dans la sélection",
      type: "Bool",
      untieColIdFromLabel: true,
    },
  },
];
const FIXED_COLUMNS = FIXED_DEFINITIONS.map(({ id }) => id);
/// Formule vide = règle « Everyone » : le verrou s'applique à tous, propriétaires compris. La
/// synchronisation (clé d'un propriétaire) le lève le temps d'écrire, puis le remet.
const ACL_FORMULA = "";
const TABLE_RESOURCE = "*";
/// Style conditionnel posé sur toutes les colonnes : une ligne sortie de la sélection est grisée.
const GREY_FORMULA = `not $${SELECTION_COLUMN}`;
const GREY_STYLE = { textColor: "#929292", fillColor: "#EEEEEE" };
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
type GristRow = { refapp_id: string } & Record<string, unknown>;
type GristColumn = { id: string; fields: { isFormula: boolean } };
/// Élément ordonné de Grist : champ d'une vue ou colonne d'une table.
type Positioned = { id: number; colId: string; parentPos: number };

@Injectable()
export class GristService {
  constructor(
    private readonly grist: GristClient,
    private readonly prisma: PrismaService,
    private readonly applicationExport: ApplicationExportService,
    private readonly applications: ApplicationRepository,
    private readonly checkPermissions: CheckPermissions,
  ) {}

  /// Écrit ce que la page de recherche affiche : les applications correspondant aux filtres, avec
  /// les colonnes visibles (`fields`, par défaut celles de la page) que le demandeur a le droit de
  /// voir. Cibles : par défaut la première table RefApp de chaque document du profil. Elles sont
  /// traitées l'une après l'autre et indépendamment : une cible en échec n'empêche pas les suivantes.
  async setup(
    searchParams: ApplicationSearchDto,
    requestor: Requestor,
    requestedTargets?: GristSyncTargetDto[],
    fields: string[] = DEFAULT_GRIST_COLUMN_FIELDS,
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

    const columns = await this.visibleColumns(fields, requestor);
    const where = await this.applicationExport.buildScopedWhere(
      searchParams,
      requestor,
    );
    const applications = where
      ? await this.applications.findSearchItems(where, { label: "asc" })
      : [];
    // Lignes sorties de la sélection mais conservées : relues sans les filtres de la page, dans le
    // seul périmètre du demandeur, pour que leurs colonnes RefApp restent à jour.
    const findInScope = async (ids: string[]) => {
      const scope = await this.applicationExport.buildScopedWhere(
        {} as ApplicationSearchDto,
        requestor,
      );
      return scope
        ? this.applications.findSearchItems(
            { AND: [scope, { id: { in: ids } }] },
            { label: "asc" },
          )
        : [];
    };

    const documents: GristDocumentReportDto[] = [];
    for (const { docId, tableId, newTable } of targets) {
      try {
        documents.push(
          await this.syncDocument(
            { ...connection, docId },
            { tableId, newTable, create: true },
            columns,
            applications,
            findInScope,
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
    const columns = await this.columns(table.request, table.tableId);
    const refApp = columns
      .map(({ id }) => id)
      .filter((id) => REFAPP_COLUMN_IDS.has(id));
    const metadata = columns.filter(isUserColumn).map(({ id }) => id);
    const { records } = await table.request<GristRecords<GristRow>>(
      `/tables/${table.tableId}/records`,
    );
    const pick = (fields: GristRow, ids: string[]) =>
      Object.fromEntries(ids.map((id) => [id, fields[id] ?? null]));
    return records.map(({ id, fields }) => ({
      rowId: id,
      refapp_id: fields.refapp_id,
      values: pick(fields, refApp),
      metadata: pick(fields, metadata),
    }));
  }

  /// Colonnes demandées, dans leur ordre, privées de celles que la page ne montre qu'avec
  /// ColumnRead : Grist ne reçoit que ce que le demandeur peut voir dans la recherche.
  private async visibleColumns(
    fields: string[],
    requestor: Requestor,
  ): Promise<GristColumnDefinition[]> {
    const canReadRestricted = await this.checkPermissions.can(
      [Permission.ColumnRead],
      requestor,
    );
    const columns = fields
      .map((field) => GRIST_COLUMNS.find((column) => column.field === field))
      .filter(
        (column): column is GristColumnDefinition =>
          !!column && (canReadRestricted || !column.restricted),
      );
    if (!columns.length) {
      throw new BadRequestException(
        "Aucune des colonnes affichées ne peut être synchronisée.",
      );
    }
    return columns;
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

  /// Upsert sur refapp_id (rowId et colonnes ajoutées dans Grist conservés). Les lignes sorties
  /// de la sélection sont conservées si elles portent des métadonnées, supprimées sinon.
  /// `findInScope` relit les applications des lignes conservées. Rejouable sans effet de bord.
  private async syncDocument(
    document: GristDocument,
    choice: TableChoice,
    columns: GristColumnDefinition[],
    applications: GristApplication[],
    findInScope: (ids: string[]) => Promise<GristApplication[]>,
  ): Promise<GristDocumentReportDto> {
    const table = (await this.resolveTable(document, choice, columns))!;
    // Les règles d'accès désignent les colonnes verrouillées : elles sont retirées avant de
    // supprimer une colonne. Le verrou est remis même si l'écriture échoue.
    await this.unlock(table);
    let report: Pick<
      GristDocumentReportDto,
      "columnsAdded" | "columnsRemoved" | "rowsKept" | "rowsDeleted"
    >;
    try {
      // Une table créée a déjà exactement les colonnes synchronisées.
      const changes = table.created
        ? { columnsAdded: [], columnsRemoved: [] }
        : await this.syncColumns(table, columns);
      if (table.created || changes.columnsAdded.includes(SELECTION_COLUMN)) {
        await this.hideSelectionColumn(table);
      }
      await this.upsert(table, columns, applications, true);
      const exited = await this.handleExitedRows(
        table,
        columns,
        new Set(applications.map((app) => app.id)),
        findInScope,
      );
      // Après l'ajout des colonnes, y compris celles ajoutées dans Grist depuis la dernière fois.
      await this.ensureGreyStyle(table);
      report = { ...changes, ...exited };
    } finally {
      await this.lock(table, columns);
    }

    return {
      docId: document.docId,
      status: "ok",
      tableId: table.tableId,
      tableCreated: table.created,
      rowsWritten: applications.length,
      ...report,
    };
  }

  private async upsert(
    { tableId, request }: GristTable,
    columns: GristColumnDefinition[],
    applications: GristApplication[],
    inSelection: boolean,
  ): Promise<void> {
    for (let i = 0; i < applications.length; i += BATCH_SIZE) {
      await request(`/tables/${tableId}/records`, {
        method: "PUT",
        body: {
          records: applications.slice(i, i + BATCH_SIZE).map((app) => ({
            require: { [KEY_COLUMN]: app.id },
            fields: {
              [SELECTION_COLUMN]: inSelection,
              ...Object.fromEntries(
                columns.map(({ colId, value }) => [colId, value(app)]),
              ),
            },
          })),
        },
      });
    }
  }

  /// Aligne les colonnes RefApp de la table sur les colonnes synchronisées : celles qui manquent
  /// sont ajoutées avant les métadonnées, celles qui ne sont plus affichées (ou d'une version
  /// précédente) sont supprimées. Les colonnes ajoutées dans Grist ne sont jamais touchées.
  private async syncColumns(
    table: GristTable,
    columns: GristColumnDefinition[],
  ): Promise<{ columnsAdded: string[]; columnsRemoved: string[] }> {
    const { tableId, request } = table;
    const existing = await this.columnIds(request, tableId);
    const wanted = [...FIXED_COLUMNS, ...columns.map(({ colId }) => colId)];
    const removed = [...existing].filter(
      (id) => REFAPP_COLUMN_IDS.has(id) && !wanted.includes(id),
    );
    const added = [
      ...FIXED_DEFINITIONS,
      ...columns.map(columnDefinition),
    ].filter(({ id }) => !existing.has(id));

    if (removed.length) {
      await request("/apply", {
        method: "POST",
        body: removed.map((id) => ["RemoveColumn", tableId, id]),
      });
    }
    if (added.length) {
      await request(`/tables/${tableId}/columns`, {
        method: "POST",
        body: { columns: added },
      });
      await this.placeRefAppColumnsFirst(table, wanted);
    }
    return {
      columnsAdded: added.map(({ id }) => id),
      columnsRemoved: removed,
    };
  }

  /// Nos tables portent la colonne refapp_id : une table RefApp sans cette clé appartient à
  /// quelqu'un d'autre et n'est jamais touchée (l'upsert y recréerait toutes les lignes).
  /// - `tableId` : cette table, qui doit exister et être à nous ;
  /// - `newTable` : la première place libre parmi RefApp, RefApp2… ;
  /// - sinon : notre première table, ou à défaut la première place libre si `create`.
  /// Une table créée reçoit les colonnes fixes et `columns` ; les colonnes d'une table existante sont
  /// alignées ensuite (syncColumns). RefApp ne crée jamais de colonne de métadonnées.
  private async resolveTable(
    document: GristDocument,
    { tableId: requested, newTable, create }: TableChoice,
    columns: GristColumnDefinition[] = [],
  ): Promise<(GristTable & { created: boolean }) | null> {
    const request: GristTable["request"] = (path, options) =>
      this.grist.request(document, path, options);
    const useExisting = async (tableId: string) => {
      const existing = await this.columnIds(request, tableId);
      if (!existing.has(KEY_COLUMN)) return null;
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
          body: {
            tables: [
              {
                id: tableId,
                columns: [
                  ...FIXED_DEFINITIONS,
                  ...columns.map(columnDefinition),
                ],
              },
            ],
          },
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

  private async columns(
    request: GristTable["request"],
    tableId: string,
  ): Promise<GristColumn[]> {
    const { columns } = await request<{ columns: GristColumn[] }>(
      `/tables/${tableId}/columns`,
    );
    return columns;
  }

  private async columnIds(
    request: GristTable["request"],
    tableId: string,
  ): Promise<Set<string>> {
    const columns = await this.columns(request, tableId);
    return new Set(columns.map((column) => column.id));
  }

  /// Colonnes de métadonnées (cf. isUserColumn).
  private async userColumns({
    tableId,
    request,
  }: GristTable): Promise<string[]> {
    return (await this.columns(request, tableId))
      .filter(isUserColumn)
      .map(({ id }) => id);
  }

  /// Place les colonnes de RefApp (dans l'ordre `order`) avant celles ajoutées dans Grist, dans
  /// chaque vue de la table et dans l'ordre des colonnes (qui sert aux nouvelles vues). Appelé
  /// seulement après un ajout de colonnes, pour ne pas défaire à chaque synchronisation la
  /// disposition de l'utilisateur.
  private async placeRefAppColumnsFirst(
    { tableId, request }: GristTable,
    order: string[],
  ): Promise<void> {
    const sql = <T>(query: string) =>
      request<GristRecords<T>>("/sql", {
        method: "POST",
        body: { sql: query, args: [tableId] },
      }).then(({ records }) => records.map(({ fields }) => fields));
    const fields = await sql<Positioned & { section: number }>(
      `SELECT f.id, f.parentId AS section, f.parentPos, c.colId
       FROM _grist_Views_section_field f
       JOIN _grist_Views_section s ON s.id = f.parentId
       JOIN _grist_Tables t ON t.id = s.tableRef
       JOIN _grist_Tables_column c ON c.id = f.colRef
       WHERE t.tableId = ?`,
    );
    const columns = await sql<Positioned>(
      `SELECT c.id, c.colId, c.parentPos
       FROM _grist_Tables_column c JOIN _grist_Tables t ON t.id = c.parentId
       WHERE t.tableId = ?`,
    );
    const sections = [...new Set(fields.map(({ section }) => section))];
    const actions = [
      [
        "_grist_Views_section_field",
        sections.flatMap((section) =>
          refAppFirst(
            fields.filter((field) => field.section === section),
            order,
          ),
        ),
      ],
      [
        "_grist_Tables_column",
        refAppFirst(
          columns.filter(({ colId }) => !isTechnical(colId)),
          order,
        ),
      ],
    ] as const;
    const body = actions
      .filter(([, moves]) => moves.length)
      .map(([table, moves]) => [
        "BulkUpdateRecord",
        table,
        moves.map(({ id }) => id),
        { parentPos: moves.map(({ parentPos }) => parentPos) },
      ]);
    if (body.length) await request("/apply", { method: "POST", body });
  }

  /// Lignes dont l'application n'est plus dans la sélection : conservées et grisées
  /// (dans_selection faux) si un utilisateur y a saisi une valeur dans une colonne ajoutée dans
  /// Grist, supprimées sinon. Les colonnes RefApp d'une ligne conservée sont mises à jour tant
  /// que le demandeur peut lire l'application ; sinon (application effacée, hors périmètre) elles
  /// gardent leurs dernières valeurs.
  private async handleExitedRows(
    table: GristTable,
    columns: GristColumnDefinition[],
    selected: Set<string>,
    findInScope: (ids: string[]) => Promise<GristApplication[]>,
  ): Promise<{ rowsKept: number; rowsDeleted: number }> {
    const { tableId, request } = table;
    const { records } = await request<GristRecords<GristRow>>(
      `/tables/${tableId}/records`,
    );
    const exited = records.filter(
      ({ fields }) => !selected.has(fields.refapp_id),
    );
    if (!exited.length) return { rowsKept: 0, rowsDeleted: 0 };

    const metadata = await this.userColumns(table);
    const [kept, removed] = partition(exited, ({ fields }) =>
      metadata.some((column) => hasValue(fields[column])),
    );
    if (removed.length) {
      await request("/apply", {
        method: "POST",
        body: [["BulkRemoveRecord", tableId, removed.map(({ id }) => id)]],
      });
    }
    if (kept.length) {
      const readable = await findInScope(
        kept.map(({ fields }) => fields.refapp_id),
      );
      await this.upsert(table, columns, readable, false);
      const refreshed = new Set(readable.map(({ id }) => id));
      const unread = kept
        .filter(
          ({ fields }) =>
            !refreshed.has(fields.refapp_id) &&
            fields[SELECTION_COLUMN] !== false,
        )
        .map(({ id }) => ({ id, fields: { [SELECTION_COLUMN]: false } }));
      for (let i = 0; i < unread.length; i += BATCH_SIZE) {
        await request(`/tables/${tableId}/records`, {
          method: "PATCH",
          body: { records: unread.slice(i, i + BATCH_SIZE) },
        });
      }
    }
    return { rowsKept: kept.length, rowsDeleted: removed.length };
  }

  /// Grise toutes les colonnes d'une ligne hors sélection. Le style conditionnel Grist est porté
  /// par une colonne helper (formule) référencée dans `rules`, et son style par l'entrée de même
  /// rang dans widgetOptions.rulesOptions. Une colonne sans règle grise en reçoit une ; le style
  /// de chaque règle grise existante est remis s'il manque (règle ajoutée sans son style). Les
  /// autres styles de la colonne sont conservés.
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
      rules: refList(fields.rules),
    }));
    const formulaOf = new Map(columns.map((c) => [c.id, c.formula]));
    const isGrey = (rule: number) => formulaOf.get(rule) === GREY_FORMULA;

    const styled = columns
      .filter((c) => !isTechnical(c.colId) && c.colId !== SELECTION_COLUMN)
      .map((c) => {
        const options = JSON.parse(c.widgetOptions || "{}") as {
          rulesOptions?: object[];
        };
        const addRule = !c.rules.some(isGrey);
        const rulesOptions = [
          ...c.rules.map((rule, rank) =>
            isGrey(rule) ? GREY_STYLE : (options.rulesOptions?.[rank] ?? {}),
          ),
          ...(addRule ? [GREY_STYLE] : []),
        ];
        return { id: c.id, options, addRule, rulesOptions };
      })
      .filter(
        ({ options, addRule, rulesOptions }) =>
          addRule ||
          JSON.stringify(rulesOptions) !==
            JSON.stringify(options.rulesOptions ?? []),
      );
    if (!styled.length) return;

    const toAdd = styled.filter(({ addRule }) => addRule);
    const { retValues } = toAdd.length
      ? await request<{ retValues: { colRef: number }[] }>("/apply", {
          method: "POST",
          body: toAdd.map(({ id }) => ["AddEmptyRule", tableId, 0, id]),
        })
      : { retValues: [] };
    await request("/apply", {
      method: "POST",
      body: [
        ...retValues.map(({ colRef }) => [
          "UpdateRecord",
          "_grist_Tables_column",
          colRef,
          { formula: GREY_FORMULA },
        ]),
        ...styled.map(({ id, options, rulesOptions }) => [
          "UpdateRecord",
          "_grist_Tables_column",
          id,
          { widgetOptions: JSON.stringify({ ...options, rulesOptions }) },
        ]),
      ],
    });
  }

  /// Retire dans_selection des vues de la table quand RefApp vient de l'ajouter : elle ne sert
  /// qu'au grisé. Les données brutes la montrent toujours. Un utilisateur qui la réaffiche la garde.
  private async hideSelectionColumn({
    tableId,
    request,
  }: GristTable): Promise<void> {
    const { records } = await request<GristRecords<{ id: number }>>("/sql", {
      method: "POST",
      body: {
        sql: `SELECT f.id FROM _grist_Views_section_field f
              JOIN _grist_Views_section s ON s.id = f.parentId
              JOIN _grist_Tables t ON t.id = s.tableRef
              JOIN _grist_Tables_column c ON c.id = f.colRef
              WHERE t.tableId = ? AND c.colId = ?
                AND s.id NOT IN (t.rawViewSectionRef, t.recordCardViewSectionRef)`,
        args: [tableId, SELECTION_COLUMN],
      },
    });
    if (!records.length) return;
    await request("/apply", {
      method: "POST",
      body: [
        [
          "BulkRemoveRecord",
          "_grist_Views_section_field",
          records.map(({ fields }) => fields.id),
        ],
      ],
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

  /// Colonnes écrites par RefApp en lecture seule ; ni ajout ni suppression de lignes.
  private async lock(
    table: GristTable,
    columns: GristColumnDefinition[],
  ): Promise<void> {
    const locked = [...FIXED_COLUMNS, ...columns.map(({ colId }) => colId)];
    await this.addRule(table, locked.join(","), "-U");
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

/// Colonne de la table Grist décrite comme dans GRIST_COLUMNS.
function columnDefinition({ colId, label, type }: GristColumnDefinition) {
  // Délié du libellé : renommer la colonne dans Grist ne change pas l'identifiant que RefApp
  // utilise pour la retrouver.
  return { id: colId, fields: { label, type, untieColIdFromLabel: true } };
}

/// Métadonnée : toute colonne de données ajoutée dans Grist, quel que soit son nom. Les formules
/// sont calculées, pas saisies : elles n'en font pas partie.
function isUserColumn({ id, fields }: GristColumn): boolean {
  return (
    !FIXED_COLUMNS.includes(id) &&
    !REFAPP_COLUMN_IDS.has(id) &&
    !isTechnical(id) &&
    !fields.isFormula
  );
}

/// Identifiants d'une colonne RefList lue en SQL : "[1,2]", ou ["L",1,2] selon la source.
function refList(value: string | null): number[] {
  const list = JSON.parse(value || "[]") as (number | "L")[];
  return list.filter((id): id is number => id !== "L");
}

/// manualSort (tri manuel) et gristHelper_* (styles conditionnels) : jamais affichées.
function isTechnical(colId: string): boolean {
  return colId === "manualSort" || colId.startsWith("gristHelper_");
}

/// Valeur d'une cellule vide selon son type Grist : "" (Text), false (Bool), 0 (Numeric, Int,
/// Ref), null (Any, Date…), ["L"] (liste). Un 0 ou un false saisi ne compte donc pas.
function hasValue(value: unknown): boolean {
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 1;
  return value != null && value !== false && value !== 0;
}

/// Nouvelles positions pour que les colonnes de RefApp (dans l'ordre `order`) précèdent les
/// autres (dans leur ordre actuel) : les positions existantes sont redistribuées, seules celles
/// qui changent sont renvoyées.
function refAppFirst(
  items: Positioned[],
  order: string[],
): { id: number; parentPos: number }[] {
  const rank = (colId: string) => {
    const index = order.indexOf(colId);
    return index === -1 ? order.length : index;
  };
  const current = [...items].sort((a, b) => a.parentPos - b.parentPos);
  const wanted = [...current].sort((a, b) => rank(a.colId) - rank(b.colId));
  return wanted
    .map(({ id }, i) => ({ id, parentPos: current[i].parentPos }))
    .filter(({ id }, i) => id !== current[i].id);
}

function partition<T>(items: T[], predicate: (item: T) => boolean): [T[], T[]] {
  const yes: T[] = [];
  const no: T[] = [];
  for (const item of items) (predicate(item) ? yes : no).push(item);
  return [yes, no];
}
