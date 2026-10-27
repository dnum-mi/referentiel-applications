import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import type { ApplicationSearchDto } from "src/applications/dto/search-application.dto";
import type { ApplicationExportService } from "src/applications/export.service";
import type { ApplicationRepository } from "src/applications/infrastructure/repository/application.repository";
import type { CheckPermissions } from "src/common/service/check-permissions.service";
import type { PrismaService } from "src/prisma/prisma.service";
import type { Requestor } from "src/user/entities/user.entity";
import type { GristClient, GristDocument, GristRequest } from "./grist.client";
import { GristSyncLockService } from "./grist-sync-lock.service";
import { GristService } from "./grist.service";
import { encryptGristApiKey } from "./grist-api-key";
import type { GristApplication } from "./grist-columns";

process.env.GRIST_ENCRYPTION_KEY = "secret-de-test";

type Call = GristDocument & { path: string } & GristRequest;
type Row = { id: number; fields: Record<string, unknown> };
type Column = {
  id: number;
  colId: string;
  rules?: number[];
  formula?: string;
  widgetOptions?: string;
  parentPos?: number;
};
type ViewField = {
  id: number;
  section: number;
  colId: string;
  parentPos: number;
};

/// Colonnes écrites avec les colonnes affichées par défaut dans la page de recherche.
const LOCKED_COLUMNS = [
  "refapp_id",
  "dans_selection",
  "iq",
  "nom",
  "priorite",
  "hebergement",
  "tags",
];
/// Table existante : colonnes de RefApp et métadonnées ajoutées dans Grist.
const ALL_COLUMNS = [
  ...LOCKED_COLUMNS,
  "metadata_1",
  "metadata_2",
  "metadata_3",
];

/// Faux document Grist : répond selon la route et garde la trace des appels. `columns` vaut pour
/// toutes les tables, sauf celles décrites dans `columnsByTable` ; `failingDocs` répondent 502, comme
/// les requêtes `failingPaths` (« MÉTHODE chemin »). `formulas` : colonnes calculées.
function fakeGrist({
  tables = [] as string[],
  columns = ALL_COLUMNS,
  columnsByTable = {} as Record<string, string[]>,
  failingDocs = [] as string[],
  failingPaths = [] as string[],
  rows = [] as Row[],
  resources = [] as { tableId: string; colIds: string; id: number }[],
  rules = [] as { id: number; resource: number; permissionsText: string }[],
  metaColumns = [] as Column[],
  viewFields = [] as ViewField[],
  formulas = [] as string[],
} = {}) {
  const calls: Call[] = [];
  let nextId = 100;
  const request = jest.fn(
    async (document: GristDocument, path: string, init: GristRequest = {}) => {
      const { docId } = document;
      calls.push({ ...document, path, ...init });
      if (failingDocs.includes(docId)) {
        throw new BadGatewayException("Grist a refusé la requête (404).");
      }
      const { method = "GET", body } = init;
      if (failingPaths.includes(`${method} ${path}`)) {
        throw new BadGatewayException("Grist a refusé la requête (500).");
      }
      if (path === "/tables" && method === "GET")
        return { tables: tables.map((id) => ({ id })) };
      if (path === "/tables" && method === "POST") return {};
      if (path.endsWith("/columns") && method === "POST") return {};
      if (path.endsWith("/columns")) {
        const tableId = path.split("/")[2];
        return {
          columns: (columnsByTable[tableId] ?? columns).map((id) => ({
            id,
            fields: { isFormula: formulas.includes(id) },
          })),
        };
      }
      if (path.endsWith("/records") && method !== "GET") return {};
      if (path.endsWith("/records")) return { records: rows };
      if (path === "/sql") {
        const { sql, args } = body as { sql: string; args: unknown[] };
        if (sql.includes("_grist_Views_section_field")) {
          return { records: viewFields.map((f) => ({ id: f.id, fields: f })) };
        }
        if (sql.includes("_grist_Tables_column")) {
          return {
            records: metaColumns.map((c) => ({
              id: c.id,
              fields: {
                formula: "",
                widgetOptions: "",
                ...c,
                rules: c.rules ? JSON.stringify(c.rules) : null,
              },
            })),
          };
        }
        if (sql.includes("JOIN")) {
          // Règles de la table, et celles des tables supprimées (hors ressources spéciales « * »).
          const found = rules.filter((r) => {
            const tableId = resources.find((s) => s.id === r.resource)?.tableId;
            return (
              tableId === args[0] ||
              (!!tableId &&
                !tableId.startsWith("*") &&
                !tables.includes(tableId))
            );
          });
          return { records: found.map(({ id }) => ({ id, fields: { id } })) };
        }
        const found = resources.filter(
          (r) => r.tableId === args[0] && r.colIds === args[1],
        );
        return { records: found.map(({ id }) => ({ id, fields: { id } })) };
      }
      if (path === "/apply") {
        return {
          retValues: (body as unknown[][]).map(([action]) =>
            action === "AddEmptyRule" ? { colRef: nextId++ } : nextId++,
          ),
        };
      }
      throw new Error(`route inattendue ${method} ${path}`);
    },
  );
  return { client: { request } as unknown as GristClient, calls };
}

function apps(count: number) {
  return Array.from(
    { length: count },
    (_, i) =>
      ({
        id: `app-${i}`,
        label: `App ${i}`,
        quality: i === 0 ? null : 80,
        priorityRestart: i === 0 ? null : "R1_STAR",
        hostings: [],
        tags: i === 0 ? [] : [{ name: "a" }, { name: "b" }],
        currentStatus: i === 0 ? null : { status: "in_production" },
      }) as unknown as GristApplication,
  );
}

/// `canReadRestricted` : le demandeur détient ColumnRead. `inScope` : applications lisibles par le
/// demandeur hors des filtres de la page (relues pour les lignes sorties conservées).
function service(
  client: GristClient,
  {
    applications = apps(2),
    where = {} as object | null,
    docIds = ["doc1"],
    gristUrl = "https://grist.example" as string | null,
    gristApiKey = encryptGristApiKey("cle-api") as string | null,
    canReadRestricted = true,
    inScope = [] as GristApplication[],
    syncLock = {
      run: async (_document, _table, action) => action(() => {}),
    } as GristSyncLockService,
  } = {},
) {
  const prisma = {
    user: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ gristDocIds: docIds, gristUrl, gristApiKey }),
    },
  } as unknown as PrismaService;
  const buildScopedWhere = jest.fn().mockResolvedValue(where);
  const applicationExport = {
    buildScopedWhere,
  } as unknown as ApplicationExportService;
  const findSearchItems = jest.fn(
    async (query: { AND?: { id?: { in: string[] } }[] }) => {
      const ids = query.AND?.[1]?.id?.in;
      return ids ? inScope.filter((app) => ids.includes(app.id)) : applications;
    },
  );
  const repository = {
    findSearchItems,
  } as unknown as ApplicationRepository;
  const can = jest.fn().mockResolvedValue(canReadRestricted);
  const checkPermissions = { can } as unknown as CheckPermissions;
  return {
    sut: new GristService(
      client,
      prisma,
      applicationExport,
      repository,
      checkPermissions,
      syncLock,
    ),
    findSearchItems,
    buildScopedWhere,
    can,
  };
}

const filters = { shortName: "app" } as ApplicationSearchDto;
const requestor = { id: "u1" } as Requestor;
/// Compte rendu de l'unique document du profil.
const setup = async (
  client: GristClient,
  options?: Parameters<typeof service>[1],
  columns?: string[],
) => {
  const { documents } = await service(client, options).sut.setup(
    filters,
    requestor,
    undefined,
    columns,
  );
  return documents[0];
};

const puts = (calls: Call[]) => calls.filter((c) => c.method === "PUT");
const patches = (calls: Call[]) => calls.filter((c) => c.method === "PATCH");
const addedColumns = (calls: Call[]) =>
  calls
    .filter((c) => c.path.endsWith("/columns") && c.method === "POST")
    .flatMap((c) => (c.body as { columns: { id: string }[] }).columns)
    .map(({ id }) => id);
const applied = (calls: Call[]) =>
  calls
    .filter((c) => c.path === "/apply")
    .flatMap((c) => c.body as unknown[][]);

function row(
  id: number,
  refappId: string,
  fields: Record<string, unknown> = {},
): Row {
  return {
    id,
    fields: {
      refapp_id: refappId,
      metadata_1: null,
      metadata_2: null,
      metadata_3: null,
      ...fields,
    },
  };
}

describe("GristService.setup", () => {
  it("crée la table au premier appel, avec refapp_id et les colonnes affichées", async () => {
    const { client, calls } = fakeGrist({ columns: LOCKED_COLUMNS });
    const report = await setup(client);

    expect(report.tableCreated).toBe(true);
    const create = calls.find(
      (c) => c.path === "/tables" && c.method === "POST",
    );
    const columns = (
      create?.body as {
        tables: {
          columns: { id: string; fields: Record<string, unknown> }[];
        }[];
      }
    ).tables[0].columns;
    expect(columns.map((c) => c.id)).toEqual(LOCKED_COLUMNS);
    expect(columns.map((c) => c.fields.label)).toEqual([
      "refapp_id",
      "Dans la sélection",
      "IQ",
      "Nom",
      "Priorité",
      "Hébergement",
      "Tags",
    ]);
    expect(columns[1].fields.type).toBe("Bool");
    expect(columns[3].fields).toEqual({
      label: "Nom",
      type: "Text",
      untieColIdFromLabel: true,
    });
    expect(report).toMatchObject({ columnsAdded: [], columnsRemoved: [] });
  });

  it("masque dans_selection des vues d'une table créée, hors données brutes", async () => {
    const { client, calls } = fakeGrist({
      columns: LOCKED_COLUMNS,
      viewFields: [
        { id: 30, section: 1, colId: "dans_selection", parentPos: 2 },
      ],
    });
    await setup(client);

    const hide = calls.find(
      (c) =>
        c.path === "/sql" &&
        (c.body as { sql: string }).sql.includes("_grist_Views_section_field"),
    );
    expect((hide?.body as { sql: string; args: unknown[] }).args).toEqual([
      "RefApp",
      "dans_selection",
    ]);
    expect((hide?.body as { sql: string }).sql).toContain("rawViewSectionRef");
    expect(applied(calls)).toContainEqual([
      "BulkRemoveRecord",
      "_grist_Views_section_field",
      [30],
    ]);
  });

  it("grise par une règle conditionnelle chaque colonne qui ne l'est pas encore, métadonnées comprises", async () => {
    const grey = { textColor: "#929292", fillColor: "#EEEEEE" };
    const { client, calls } = fakeGrist({
      tables: ["RefApp"],
      metaColumns: [
        { id: 1, colId: "manualSort" },
        { id: 2, colId: "refapp_id" },
        { id: 3, colId: "dans_selection" },
        // Le SQL de Grist renvoie la RefList sans le préfixe "L".
        {
          id: 4,
          colId: "nom",
          rules: [9],
          widgetOptions: JSON.stringify({ rulesOptions: [grey] }),
        },
        // Règle grise ajoutée en double sans son style (versions précédentes) : style réparé.
        {
          id: 6,
          colId: "statut",
          rules: [9, 10],
          widgetOptions: JSON.stringify({ rulesOptions: [grey] }),
        },
        {
          id: 5,
          colId: "toto",
          rules: ["L" as unknown as number, 8],
          widgetOptions: JSON.stringify({
            alignment: "left",
            rulesOptions: [{ textColor: "#FF0000" }],
          }),
        },
        { id: 8, colId: "gristHelper_ConditionalRule", formula: "$x > 1" },
        {
          id: 9,
          colId: "gristHelper_ConditionalRule2",
          formula: "not $dans_selection",
        },
        {
          id: 10,
          colId: "gristHelper_ConditionalRule3",
          formula: "not $dans_selection",
        },
      ],
    });
    await setup(client);

    const actions = applied(calls);
    expect(actions.filter(([action]) => action === "AddEmptyRule")).toEqual([
      ["AddEmptyRule", "RefApp", 0, 2],
      ["AddEmptyRule", "RefApp", 0, 5],
    ]);
    expect(actions).toContainEqual([
      "UpdateRecord",
      "_grist_Tables_column",
      5,
      {
        widgetOptions: JSON.stringify({
          alignment: "left",
          rulesOptions: [{ textColor: "#FF0000" }, grey],
        }),
      },
    ]);
    expect(actions).toContainEqual([
      "UpdateRecord",
      "_grist_Tables_column",
      6,
      { widgetOptions: JSON.stringify({ rulesOptions: [grey, grey] }) },
    ]);
    expect(
      actions.some(([action, , id]) => action === "UpdateRecord" && id === 4),
    ).toBe(false);
    expect(
      actions.filter(
        ([action, , , fields]) =>
          action === "UpdateRecord" &&
          (fields as { formula?: string }).formula === "not $dans_selection",
      ),
    ).toHaveLength(2);
  });

  it("ne recrée pas une table existante", async () => {
    const { client, calls } = fakeGrist({ tables: ["RefApp"] });
    const report = await setup(client);

    expect(report.tableCreated).toBe(false);
    expect(calls.some((c) => c.path === "/tables" && c.method === "POST")).toBe(
      false,
    );
  });

  it("ajoute à une table existante les colonnes affichées manquantes, avant celles ajoutées dans Grist", async () => {
    // Après l'ajout, Grist a placé statut à droite de toto.
    const order = ["refapp_id", "iq", "nom", "toto", "statut"];
    const { client, calls } = fakeGrist({
      tables: ["RefApp"],
      columns: ["refapp_id", "dans_selection", "iq", "nom", "toto"],
      // Deux vues : la vue brute (section 1) et un widget où l'utilisateur a mis toto en tête.
      viewFields: [
        ...order.map((colId, i) => ({
          id: 10 + i,
          section: 1,
          colId,
          parentPos: i + 1,
        })),
        { id: 20, section: 2, colId: "toto", parentPos: 1 },
        { id: 21, section: 2, colId: "refapp_id", parentPos: 2 },
        { id: 22, section: 2, colId: "statut", parentPos: 3 },
      ],
      metaColumns: [
        { id: 1, colId: "manualSort", parentPos: 1 },
        ...order.map((colId, i) => ({ id: 2 + i, colId, parentPos: i + 2 })),
        { id: 8, colId: "gristHelper_ConditionalRule", parentPos: 3.5 },
      ],
    });
    const report = await setup(client, {}, ["quality", "label", "status"]);

    expect(addedColumns(calls)).toEqual(["statut"]);
    expect(report).toMatchObject({
      columnsAdded: ["statut"],
      columnsRemoved: [],
    });
    expect(applied(calls)).toContainEqual([
      "BulkUpdateRecord",
      "_grist_Views_section_field",
      [14, 13, 21, 22, 20],
      { parentPos: [4, 5, 1, 2, 3] },
    ]);
    expect(applied(calls)).toContainEqual([
      "BulkUpdateRecord",
      "_grist_Tables_column",
      [6, 5],
      { parentPos: [5, 6] },
    ]);
  });

  it("retire les colonnes RefApp qui ne sont plus affichées, jamais celles ajoutées dans Grist", async () => {
    // Synchronisée avec IQ, Nom et Statut, puis avec IQ, Statut et Tags.
    const { client, calls } = fakeGrist({
      tables: ["RefApp"],
      columns: ["refapp_id", "dans_selection", "iq", "nom", "statut", "toto"],
      rows: [row(1, "app-0", { toto: "garde" })],
    });
    const report = await setup(client, {}, ["quality", "status", "tag"]);

    expect(report).toMatchObject({
      columnsAdded: ["tags"],
      columnsRemoved: ["nom"],
    });
    expect(applied(calls)).toContainEqual(["RemoveColumn", "RefApp", "nom"]);
    expect(
      applied(calls).filter(([action]) => action === "RemoveColumn"),
    ).toHaveLength(1);
    expect(addedColumns(calls)).toEqual(["tags"]);
    // Les règles d'accès (qui désignent les colonnes) sont retirées avant la colonne.
    const index = (predicate: (c: Call) => boolean) =>
      calls.findIndex(predicate);
    const isApplied = (action: string) => (c: Call) =>
      c.path === "/apply" &&
      (c.body as unknown[][]).some(([a]) => a === action);
    expect(index((c) => c.path === "/sql")).toBeLessThan(
      index(isApplied("RemoveColumn")),
    );
    expect(
      (puts(calls)[0].body as { records: { fields: object }[] }).records[1],
    ).toEqual({
      require: { refapp_id: "app-1" },
      fields: {
        dans_selection: true,
        iq: "80%",
        statut: "En production",
        tags: "a, b",
      },
    });
  });

  it("retire motif_sortie des versions précédentes, et garde dans_selection visible", async () => {
    const { client, calls } = fakeGrist({
      tables: ["RefApp"],
      columns: [
        "refapp_id",
        "nom",
        "statut",
        "dans_selection",
        "motif_sortie",
        "metadata_1",
      ],
      viewFields: [
        { id: 30, section: 1, colId: "dans_selection", parentPos: 4 },
      ],
    });
    const report = await setup(client, {}, ["label", "status"]);

    expect(report).toMatchObject({
      columnsAdded: [],
      columnsRemoved: ["motif_sortie"],
    });
    expect(
      applied(calls).filter(([action]) => action === "BulkRemoveRecord"),
    ).toEqual([]);
  });

  it("ajoute et masque dans_selection dans une table qui ne l'a pas", async () => {
    const { client, calls } = fakeGrist({
      tables: ["RefApp"],
      columns: ["refapp_id", "nom", "metadata_1"],
      viewFields: [
        { id: 30, section: 1, colId: "dans_selection", parentPos: 3 },
      ],
    });
    const report = await setup(client, {}, ["label"]);

    expect(report.columnsAdded).toEqual(["dans_selection"]);
    expect(applied(calls)).toContainEqual([
      "BulkRemoveRecord",
      "_grist_Views_section_field",
      [30],
    ]);
  });

  it("n'écrit que les colonnes que le demandeur peut voir dans la page", async () => {
    const { client, calls } = fakeGrist({ tables: ["RefApp"] });
    const report = await setup(client, { canReadRestricted: false }, [
      "label",
      "moa",
      "hostingDisplay",
    ]);

    expect(report.columnsRemoved).toEqual([
      "iq",
      "priorite",
      "hebergement",
      "tags",
    ]);
    expect(
      (puts(calls)[0].body as { records: { fields: object }[] }).records[0]
        .fields,
    ).toEqual({ dans_selection: true, nom: "App 0" });
    expect(
      applied(calls).find(
        ([action, table]) =>
          action === "AddRecord" && table === "_grist_ACLResources",
      )?.[3],
    ).toEqual({ tableId: "RefApp", colIds: "refapp_id,dans_selection,nom" });
  });

  it("refuse une synchronisation sans aucune colonne visible", async () => {
    const { client, calls } = fakeGrist({ tables: ["RefApp"] });

    await expect(
      service(client, { canReadRestricted: false }).sut.setup(
        filters,
        requestor,
        undefined,
        ["moa"],
      ),
    ).rejects.toThrow(BadRequestException);
    expect(calls).toHaveLength(0);
  });

  it("ne déplace aucune colonne quand il n'en manque pas", async () => {
    const { client, calls } = fakeGrist({
      tables: ["RefApp"],
      columns: [...ALL_COLUMNS, "toto"],
      viewFields: [{ id: 20, section: 2, colId: "toto", parentPos: 1 }],
    });
    await setup(client);

    expect(
      calls.some(
        (c) => c.path === "/tables/RefApp/columns" && c.method === "POST",
      ),
    ).toBe(false);
    expect(
      applied(calls).some(([action]) => action === "BulkUpdateRecord"),
    ).toBe(false);
  });

  it("crée RefApp2 si la table RefApp existante n'est pas la nôtre, sans toucher à RefApp", async () => {
    const { client, calls } = fakeGrist({
      tables: ["RefApp"],
      columnsByTable: { RefApp: ["A", "B"] },
    });
    const report = await setup(client);

    expect(report).toMatchObject({ tableId: "RefApp2", tableCreated: true });
    const create = calls.find(
      (c) => c.path === "/tables" && c.method === "POST",
    );
    expect((create?.body as { tables: { id: string }[] }).tables[0].id).toBe(
      "RefApp2",
    );
    expect(puts(calls).map((c) => c.path)).toEqual(["/tables/RefApp2/records"]);
    expect(
      calls.some((c) => c.path.startsWith("/tables/RefApp/") && c.method),
    ).toBe(false);
  });

  it("réutilise RefApp2 quand c'est elle qui porte refapp_id", async () => {
    const { client, calls } = fakeGrist({
      tables: ["RefApp", "RefApp2"],
      columnsByTable: { RefApp: ["A"] },
      rows: [row(7, "old")],
    });
    const report = await setup(client);

    expect(report).toMatchObject({ tableId: "RefApp2", tableCreated: false });
    expect(applied(calls)).toContainEqual(["BulkRemoveRecord", "RefApp2", [7]]);
  });

  it("sélectionne les applications avec les filtres et le périmètre du demandeur", async () => {
    const { client } = fakeGrist({ tables: ["RefApp"] });
    const where = { AND: [{ shortName: "app" }] };
    const { sut, findSearchItems, buildScopedWhere } = service(client, {
      where,
    });
    await sut.setup(filters, requestor);

    expect(buildScopedWhere).toHaveBeenCalledWith(filters, requestor);
    expect(findSearchItems).toHaveBeenCalledWith(where, { label: "asc" });
  });

  it("n'écrit aucune application si le demandeur ne peut en lire aucune", async () => {
    const { client, calls } = fakeGrist({ tables: ["RefApp"] });
    const report = await setup(client, { where: null });

    expect(report.rowsWritten).toBe(0);
    expect(puts(calls)).toHaveLength(0);
  });

  it("fait un upsert sur refapp_id des valeurs affichées, sans jamais envoyer les métadonnées", async () => {
    const { client, calls } = fakeGrist({ tables: ["RefApp"] });
    const report = await setup(client);

    expect(report.rowsWritten).toBe(2);
    expect((puts(calls)[0].body as { records: unknown[] }).records).toEqual([
      {
        require: { refapp_id: "app-0" },
        fields: {
          dans_selection: true,
          iq: "",
          nom: "App 0",
          priorite: "",
          hebergement: "",
          tags: "",
        },
      },
      {
        require: { refapp_id: "app-1" },
        fields: {
          dans_selection: true,
          iq: "80%",
          nom: "App 1",
          priorite: "R1*",
          hebergement: "",
          tags: "a, b",
        },
      },
    ]);
  });

  it("découpe l'upsert en lots de 500", async () => {
    const { client, calls } = fakeGrist({ tables: ["RefApp"] });
    await setup(client, { applications: apps(1201) });

    expect(
      puts(calls).map((c) => (c.body as { records: unknown[] }).records.length),
    ).toEqual([500, 500, 201]);
  });

  it("ne touche pas aux lignes encore dans la sélection", async () => {
    const { client, calls } = fakeGrist({
      tables: ["RefApp"],
      rows: [row(1, "app-0"), row(2, "app-1", { metadata_1: "x" })],
    });
    const report = await setup(client);

    expect(report).toMatchObject({ rowsKept: 0, rowsDeleted: 0 });
    expect(
      applied(calls).some(([action]) => action === "BulkRemoveRecord"),
    ).toBe(false);
  });

  it("conserve et grise une ligne sortie qui porte des métadonnées, et met à jour ses colonnes RefApp", async () => {
    const { client, calls } = fakeGrist({
      tables: ["RefApp"],
      rows: [row(7, "old", { metadata_2: "note" })],
    });
    const [old] = apps(2).slice(1);
    const where = { AND: [{ shortName: "app" }] };
    const { sut, buildScopedWhere, findSearchItems } = service(client, {
      where,
      inScope: [{ ...old, id: "old", label: "Ancienne" } as GristApplication],
    });
    const {
      documents: [report],
    } = await sut.setup(filters, requestor);

    expect(report).toMatchObject({ rowsKept: 1, rowsDeleted: 0 });
    // Relue dans le seul périmètre du demandeur, sans les filtres de la page.
    expect(buildScopedWhere).toHaveBeenCalledWith({}, requestor);
    expect(findSearchItems).toHaveBeenLastCalledWith(
      { AND: [where, { id: { in: ["old"] } }] },
      { label: "asc" },
    );
    expect((puts(calls)[1].body as { records: unknown[] }).records).toEqual([
      {
        require: { refapp_id: "old" },
        fields: expect.objectContaining({
          dans_selection: false,
          nom: "Ancienne",
        }),
      },
    ]);
    expect(patches(calls)).toHaveLength(0);
    expect(
      applied(calls).some(([action]) => action === "BulkRemoveRecord"),
    ).toBe(false);
  });

  it("grise sans autre changement une ligne conservée dont l'application n'est plus lisible", async () => {
    const { client, calls } = fakeGrist({
      tables: ["RefApp"],
      rows: [
        row(7, "old", { metadata_2: "note", dans_selection: true }),
        row(8, "deja", { metadata_2: "note", dans_selection: false }),
      ],
    });
    const report = await setup(client);

    expect(report).toMatchObject({ rowsKept: 2, rowsDeleted: 0 });
    expect(puts(calls)).toHaveLength(1);
    expect(patches(calls).map((c) => c.body)).toEqual([
      { records: [{ id: 7, fields: { dans_selection: false } }] },
    ]);
  });

  it("conserve une ligne sortie qui n'a de valeur que dans une colonne ajoutée dans Grist", async () => {
    const { client } = fakeGrist({
      tables: ["RefApp"],
      columns: [...LOCKED_COLUMNS, "toto", "budget"],
      rows: [row(7, "old", { toto: "", budget: 1200 })],
    });
    const report = await setup(client);

    expect(report).toMatchObject({ rowsKept: 1, rowsDeleted: 0 });
  });

  it("supprime une ligne sortie dont les colonnes ajoutées sont vides ou calculées", async () => {
    const { client, calls } = fakeGrist({
      tables: ["RefApp"],
      columns: [
        ...LOCKED_COLUMNS,
        "texte",
        "nombre",
        "case",
        "liste",
        "date",
        "calcul",
      ],
      formulas: ["calcul"],
      rows: [
        row(7, "old", {
          texte: " ",
          nombre: 0,
          case: false,
          liste: ["L"],
          date: null,
          calcul: "toujours rempli",
        }),
      ],
    });
    const report = await setup(client);

    expect(report).toMatchObject({ rowsKept: 0, rowsDeleted: 1 });
    expect(applied(calls)).toContainEqual(["BulkRemoveRecord", "RefApp", [7]]);
  });

  it("supprime les lignes sorties sans métadonnées, espaces seuls compris", async () => {
    const { client, calls } = fakeGrist({
      tables: ["RefApp"],
      rows: [row(7, "old"), row(8, "gone", { metadata_3: "  " })],
    });
    const report = await setup(client);

    expect(report).toMatchObject({ rowsKept: 0, rowsDeleted: 2 });
    expect(applied(calls)).toContainEqual([
      "BulkRemoveRecord",
      "RefApp",
      [7, 8],
    ]);
  });

  it("retire avant l'upsert toutes les règles de la table, anciennes exemptions comprises", async () => {
    const { client, calls } = fakeGrist({
      tables: ["RefApp", "Autre"],
      resources: [
        { tableId: "RefApp", colIds: "*", id: 3 },
        { tableId: "RefApp", colIds: "refapp_id,nom,statut", id: 4 },
        { tableId: "Autre", colIds: "*", id: 9 },
      ],
      rules: [
        { id: 30, resource: 3, permissionsText: "-CD" },
        { id: 40, resource: 4, permissionsText: "-U" },
        { id: 90, resource: 9, permissionsText: "-CD" },
      ],
    });
    await setup(client);

    const removal = calls.findIndex(
      (c) =>
        c.path === "/apply" &&
        (c.body as unknown[][])[0][0] === "BulkRemoveRecord",
    );
    expect(calls[removal].body).toEqual([
      ["BulkRemoveRecord", "_grist_ACLRules", [30, 40]],
    ]);
    expect(removal).toBeLessThan(calls.findIndex((c) => c.method === "PUT"));
  });

  it("retire aussi les règles d'une table supprimée, que Grist refuserait", async () => {
    const { client, calls } = fakeGrist({
      tables: ["RefApp", "Autre"],
      resources: [
        { tableId: "RefApp", colIds: "*", id: 3 },
        { tableId: "RefApp2", colIds: "*", id: 10 },
        { tableId: "Autre", colIds: "*", id: 9 },
        { tableId: "*", colIds: "*", id: 5 },
      ],
      rules: [
        { id: 30, resource: 3, permissionsText: "-CD" },
        { id: 100, resource: 10, permissionsText: "-CD" },
        { id: 90, resource: 9, permissionsText: "-CD" },
        { id: 50, resource: 5, permissionsText: "-D" },
      ],
    });
    await setup(client);

    expect(
      calls.find(
        (c) =>
          c.path === "/apply" &&
          (c.body as unknown[][])[0][0] === "BulkRemoveRecord",
      )?.body,
    ).toEqual([["BulkRemoveRecord", "_grist_ACLRules", [30, 100]]]);
  });

  it("remet le verrou pour tous une fois les colonnes et les lignes écrites", async () => {
    const { client, calls } = fakeGrist({
      tables: ["RefApp"],
      rows: [row(7, "gone", { metadata_1: "note" })],
      metaColumns: [{ id: 2, colId: "nom" }],
    });
    await setup(client);

    const firstAction = (c: Call) =>
      c.path === "/apply" ? (c.body as unknown[][])[0] : [];
    const isRuleAdded = (c: Call) => {
      const [action, table] = firstAction(c);
      return action === "AddRecord" && table === "_grist_ACLRules";
    };
    const isWrite = (c: Call) =>
      c.method === "PUT" ||
      (c.path.endsWith("/columns") && c.method === "POST") ||
      ["BulkRemoveRecord", "RemoveColumn", "UpdateRecord"].includes(
        firstAction(c)[0] as string,
      );

    expect(
      calls
        .filter(isRuleAdded)
        .map((c) => firstAction(c)[3] as Record<string, string>)
        .map((rule) => [rule.aclFormula, rule.permissionsText]),
    ).toEqual([
      ["", "-U"],
      ["", "-CD"],
    ]);
    const lastWrite =
      calls.length - 1 - [...calls].reverse().findIndex(isWrite);
    expect(calls.findIndex(isRuleAdded)).toBeGreaterThan(lastWrite);
  });

  it("remet le verrou même si l'écriture échoue", async () => {
    const { client, calls } = fakeGrist({
      tables: ["RefApp"],
      failingPaths: ["PUT /tables/RefApp/records"],
    });
    const report = await setup(client);

    expect(report).toEqual({
      docId: "doc1",
      status: "error",
      error: "Grist a refusé la requête (500).",
    });
    const added = applied(calls).filter(
      ([action, table]) =>
        action === "AddRecord" && table === "_grist_ACLRules",
    );
    expect(added).toHaveLength(2);
  });

  it("restaure les ACL avec les colonnes restantes après un échec d'ajout", async () => {
    const { client, calls } = fakeGrist({
      tables: ["RefApp"],
      columns: ["refapp_id", "nom", "metadata_1"],
      failingPaths: ["POST /tables/RefApp/columns"],
      rows: [row(1, "app-0", { metadata_1: "annotation" })],
    });
    expect((await setup(client)).status).toBe("error");
    const resources = applied(calls).filter(
      ([action, table]) =>
        action === "AddRecord" && table === "_grist_ACLResources",
    );
    expect(resources.map(([, , , fields]) => fields)).toEqual([
      { tableId: "RefApp", colIds: "refapp_id,nom" },
      { tableId: "RefApp", colIds: "*" },
    ]);
    expect(applied(calls).filter(([, table]) => table === "RefApp")).toEqual(
      [],
    );
    expect(puts(calls)).toEqual([]);
  });

  it("tente de restaurer les ACL après un déverrouillage partiellement appliqué", async () => {
    const { client, calls } = fakeGrist({
      tables: ["RefApp"],
      resources: [{ tableId: "RefApp", colIds: "*", id: 1 }],
      rules: [{ id: 2, resource: 1, permissionsText: "-CD" }],
    });
    const original = client.request.bind(client);
    let failed = false;
    client.request = async (document, path, options = {}) => {
      const result = await original(document, path, options);
      if (!failed && path === "/apply") {
        failed = true;
        throw new BadGatewayException("Réponse perdue après déverrouillage");
      }
      return result;
    };
    expect((await setup(client)).status).toBe("error");
    expect(
      applied(calls).filter(
        ([action, table]) =>
          action === "AddRecord" && table === "_grist_ACLRules",
      ),
    ).toHaveLength(2);
    expect(puts(calls)).toEqual([]);
  });

  it("réutilise les ressources existantes", async () => {
    const { client, calls } = fakeGrist({
      tables: ["RefApp"],
      resources: [
        {
          tableId: "RefApp",
          colIds: "refapp_id,dans_selection,iq,nom,priorite,hebergement,tags",
          id: 1,
        },
        { tableId: "RefApp", colIds: "*", id: 2 },
      ],
    });
    await setup(client);

    const actions = applied(calls);
    expect(actions.some(([, table]) => table === "_grist_ACLResources")).toBe(
      false,
    );
    expect(
      actions
        .filter(([, table]) => table === "_grist_ACLRules")
        .map(([, , , fields]) => (fields as { resource: number }).resource),
    ).toEqual([1, 2]);
  });
});

describe("GristService.records", () => {
  it("expose le rowId Grist, les colonnes de RefApp et les métadonnées", async () => {
    const { client } = fakeGrist({
      tables: ["RefApp"],
      columns: ["refapp_id", "nom", "statut", "metadata_1", "toto", "calcul"],
      formulas: ["calcul"],
      rows: [
        row(7, "a1", { nom: "App", statut: "POC", metadata_1: "x", calcul: 1 }),
      ],
    });
    expect(await service(client).sut.records("doc1", requestor)).toEqual([
      {
        rowId: 7,
        refapp_id: "a1",
        values: { nom: "App", statut: "POC" },
        metadata: { metadata_1: "x", toto: null },
      },
    ]);
  });

  it("refuse un document absent du profil, sans appeler Grist", async () => {
    const { client, calls } = fakeGrist({ tables: ["RefApp"] });

    await expect(
      service(client).sut.records("autre", requestor),
    ).rejects.toThrow(ForbiddenException);
    expect(calls).toHaveLength(0);
  });

  it("renvoie une liste vide sans créer de table", async () => {
    const { client, calls } = fakeGrist({
      tables: ["RefApp"],
      columnsByTable: { RefApp: ["A"] },
    });

    expect(await service(client).sut.records("doc1", requestor)).toEqual([]);
    expect(calls.some((c) => c.method === "POST")).toBe(false);
  });
});

describe("GristService.setup, plusieurs documents", () => {
  it("refuse la synchronisation sans document dans le profil", async () => {
    const { client, calls } = fakeGrist();

    await expect(
      service(client, { docIds: [] }).sut.setup(filters, requestor),
    ).rejects.toThrow(BadRequestException);
    expect(calls).toHaveLength(0);
  });

  it("synchronise chaque document du profil avec la même sélection", async () => {
    const { client, calls } = fakeGrist({ tables: ["RefApp"] });
    const { sut, findSearchItems } = service(client, {
      docIds: ["doc1", "doc2"],
    });
    const { documents } = await sut.setup(filters, requestor);

    expect(documents.map(({ docId, status }) => ({ docId, status }))).toEqual([
      { docId: "doc1", status: "ok" },
      { docId: "doc2", status: "ok" },
    ]);
    expect(findSearchItems).toHaveBeenCalledTimes(1);
    expect(puts(calls).map((c) => c.docId)).toEqual(["doc1", "doc2"]);
  });

  it("poursuit avec les documents suivants quand l'un d'eux échoue", async () => {
    const { client, calls } = fakeGrist({
      tables: ["RefApp"],
      failingDocs: ["doc1"],
    });
    const { documents } = await service(client, {
      docIds: ["doc1", "doc2"],
    }).sut.setup(filters, requestor);

    expect(documents).toEqual([
      {
        docId: "doc1",
        status: "error",
        error: "Grist a refusé la requête (404).",
      },
      expect.objectContaining({ docId: "doc2", status: "ok", rowsWritten: 2 }),
    ]);
    expect(puts(calls).map((c) => c.docId)).toEqual(["doc2"]);
  });

  it.each([
    ["sans URL", { gristUrl: null }],
    ["sans clé d'API", { gristApiKey: null }],
  ])("refuse la synchronisation %s dans le profil", async (_, profile) => {
    const { client, calls } = fakeGrist();

    await expect(
      service(client, profile).sut.setup(filters, requestor),
    ).rejects.toThrow(BadRequestException);
    expect(calls).toHaveLength(0);
  });

  it("refuse une clé d'API illisible (enregistrée en clair ou avec un autre secret)", async () => {
    const { client, calls } = fakeGrist();

    await expect(
      service(client, { gristApiKey: "cle-en-clair" }).sut.setup(
        filters,
        requestor,
      ),
    ).rejects.toThrow("Clé d'API Grist illisible");
    expect(calls).toHaveLength(0);
  });

  it("appelle l'instance Grist avec la clé d'API du profil, relue explicitement et déchiffrée", async () => {
    const { client, calls } = fakeGrist({ tables: ["RefApp"] });
    const { sut } = service(client);
    await sut.setup(filters, requestor);

    expect(calls[0]).toMatchObject({
      url: "https://grist.example",
      apiKey: "cle-api",
      docId: "doc1",
    });
  });
});

describe("GristService.setup, tables choisies", () => {
  const sync = (
    client: GristClient,
    targets: Parameters<GristService["setup"]>[2],
    options?: Parameters<typeof service>[1],
  ) => service(client, options).sut.setup(filters, requestor, targets);

  it("met à jour la table existante demandée, et elle seule", async () => {
    const { client, calls } = fakeGrist({ tables: ["RefApp", "RefApp2"] });
    const { documents } = await sync(client, [
      { docId: "doc1", tableId: "RefApp2" },
    ]);

    expect(documents[0]).toMatchObject({
      status: "ok",
      tableId: "RefApp2",
      tableCreated: false,
    });
    expect(puts(calls).map((c) => c.path)).toEqual(["/tables/RefApp2/records"]);
    expect(calls.some((c) => c.path.startsWith("/tables/RefApp/"))).toBe(false);
  });

  it("crée une nouvelle table au premier nom libre, sans toucher aux autres", async () => {
    const { client, calls } = fakeGrist({
      tables: ["RefApp", "RefApp2", "Autre"],
      columnsByTable: { RefApp2: ["A"] },
    });
    const { documents } = await sync(client, [
      { docId: "doc1", newTable: true },
    ]);

    expect(documents[0]).toMatchObject({
      tableId: "RefApp3",
      tableCreated: true,
    });
    expect(puts(calls).map((c) => c.path)).toEqual(["/tables/RefApp3/records"]);
    expect(calls.some((c) => c.path.endsWith("/columns"))).toBe(false);
  });

  it.each([
    ["absente", { tables: ["RefApp"] }, "La table RefApp2 n'existe pas"],
    [
      "non créée par RefApp",
      { tables: ["RefApp2"], columnsByTable: { RefApp2: ["A"] } },
      "La table RefApp2 n'a pas été créée par RefApp",
    ],
  ])(
    "signale une table demandée %s sans rien écrire",
    async (_, grist, error) => {
      const { client, calls } = fakeGrist(grist);
      const { documents } = await sync(client, [
        { docId: "doc1", tableId: "RefApp2" },
      ]);

      expect(documents[0]).toMatchObject({
        docId: "doc1",
        tableId: "RefApp2",
        status: "error",
        error: expect.stringContaining(error),
      });
      expect(calls.some((c) => c.method && c.method !== "GET")).toBe(false);
    },
  );

  it("refuse un document hors profil, sans appeler Grist", async () => {
    const { client, calls } = fakeGrist();

    await expect(sync(client, [{ docId: "autre-doc" }])).rejects.toThrow(
      ForbiddenException,
    );
    expect(calls).toHaveLength(0);
  });

  it("refuse une cible qui demande à la fois une table existante et une nouvelle", async () => {
    const { client, calls } = fakeGrist();

    await expect(
      sync(client, [{ docId: "doc1", tableId: "RefApp", newTable: true }]),
    ).rejects.toThrow(BadRequestException);
    expect(calls).toHaveLength(0);
  });
});

describe("GristService.tables", () => {
  it("liste par rang les tables RefApp créées par RefApp, document par document", async () => {
    const { client } = fakeGrist({
      tables: ["RefApp10", "Autre", "RefApp", "RefApp2", "RefApp3", "RefAppX"],
      columnsByTable: { RefApp2: ["A"] },
      failingDocs: ["doc2"],
    });

    expect(
      await service(client, { docIds: ["doc1", "doc2"] }).sut.tables(requestor),
    ).toEqual([
      { docId: "doc1", tables: ["RefApp", "RefApp3", "RefApp10"] },
      {
        docId: "doc2",
        tables: [],
        error: "Grist a refusé la requête (404).",
      },
    ]);
  });

  it("exige la connexion Grist du profil", async () => {
    const { client } = fakeGrist();

    await expect(
      service(client, { gristApiKey: null }).sut.tables(requestor),
    ).rejects.toThrow(BadRequestException);
  });
});

describe("GristService.records, table choisie", () => {
  it("lit la table demandée", async () => {
    const { client, calls } = fakeGrist({ tables: ["RefApp", "RefApp2"] });
    await service(client).sut.records("doc1", requestor, "RefApp2");

    expect(calls.at(-1)?.path).toBe("/tables/RefApp2/records");
  });

  it("refuse une table absente du document", async () => {
    const { client } = fakeGrist({ tables: ["RefApp"] });

    await expect(
      service(client).sut.records("doc1", requestor, "RefApp2"),
    ).rejects.toThrow(NotFoundException);
  });
});

function barrier() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

describe("synchronisations concurrentes — verrous PostgreSQL réels", () => {
  const locks = () =>
    new GristSyncLockService({ url: process.env.DATABASE_URL });

  it.each(["upsert", "ACL"])(
    "refuse une sélection disjointe pendant %s, puis permet de réessayer",
    async (stage) => {
      const rows = [row(9, "annotated", { metadata_1: "à conserver" })];
      const { client, calls } = fakeGrist({ tables: ["RefApp"], rows });
      const original = client.request.bind(client);
      const entered = barrier();
      const resume = barrier();
      let pause = true;
      client.request = async (document, path, options = {}) => {
        if (options.method === "PUT") {
          for (const record of (
            options.body as {
              records: { require: { refapp_id: string }; fields: object }[];
            }
          ).records) {
            const existing = rows.find(
              (r) => r.fields.refapp_id === record.require.refapp_id,
            );
            if (existing) Object.assign(existing.fields, record.fields);
            else
              rows.push({
                id: rows.length + 10,
                fields: {
                  refapp_id: record.require.refapp_id,
                  ...record.fields,
                },
              });
          }
          if (pause && stage === "upsert") {
            entered.release();
            await resume.promise;
          }
        }
        if (path === "/apply") {
          for (const [action, target, ids] of options.body as [
            string,
            string,
            number[],
          ][]) {
            if (
              pause &&
              stage === "ACL" &&
              action === "AddRecord" &&
              target === "_grist_ACLRules"
            ) {
              entered.release();
              await resume.promise;
            }
            if (action === "BulkRemoveRecord" && target === "RefApp") {
              for (let i = rows.length - 1; i >= 0; i--)
                if (ids.includes(rows[i].id)) rows.splice(i, 1);
            }
          }
        }
        return original(document, path, options);
      };
      const first = service(client, {
        applications: [apps(2)[0]],
        syncLock: locks(),
      }).sut;
      const second = service(client, {
        applications: [apps(2)[1]],
        syncLock: locks(),
      }).sut;
      const running = first.setup(filters, requestor);
      try {
        await entered.promise;
        const before = calls.filter(
          (call) =>
            call.path !== "/sql" && call.method && call.method !== "GET",
        ).length;
        const report = await second.setup(filters, { ...requestor, id: "u2" }, [
          { docId: "doc1", tableId: "RefApp" },
        ]);
        expect(report.documents[0]).toMatchObject({
          status: "error",
          error: expect.stringContaining("déjà en cours"),
        });
        expect(
          calls.filter(
            (call) =>
              call.path !== "/sql" && call.method && call.method !== "GET",
          ),
        ).toHaveLength(before);
      } finally {
        pause = false;
        resume.release();
      }
      expect((await running).documents[0].status).toBe("ok");
      expect(rows.map((r) => r.fields.refapp_id)).toEqual([
        "annotated",
        "app-0",
      ]);
      expect((await second.setup(filters, requestor)).documents[0].status).toBe(
        "ok",
      );
      expect(rows.map((r) => r.fields.refapp_id)).toEqual([
        "annotated",
        "app-1",
      ]);
      expect(rows[0].fields.metadata_1).toBe("à conserver");
    },
  );

  it.each([
    ["doc1", "RefApp2"],
    ["doc2", "RefApp"],
  ])(
    "laisse %s/%s progresser pendant une autre synchronisation",
    async (docId, tableId) => {
      const { client } = fakeGrist({ tables: ["RefApp", "RefApp2"] });
      const original = client.request.bind(client);
      const entered = barrier();
      const resume = barrier();
      client.request = async (document, path, options = {}) => {
        if (
          document.docId === "doc1" &&
          path === "/tables/RefApp/records" &&
          options.method === "PUT"
        ) {
          entered.release();
          await resume.promise;
        }
        return original(document, path, options);
      };
      const first = service(client, { syncLock: locks() }).sut.setup(
        filters,
        requestor,
      );
      try {
        await entered.promise;
        const second = await service(client, {
          docIds: [docId],
          syncLock: locks(),
        }).sut.setup(filters, requestor, [{ docId, tableId }]);
        expect(second.documents[0].status).toBe("ok");
      } finally {
        resume.release();
      }
      expect((await first).documents[0].status).toBe("ok");
    },
  );

  it("protège aussi la création et refuse un emplacement devenu occupé", async () => {
    const tables: string[] = [];
    const { client } = fakeGrist({ tables });
    const original = client.request.bind(client);
    const entered = barrier();
    const resume = barrier();
    client.request = async (document, path, options = {}) => {
      if (path === "/tables" && options.method === "POST") {
        entered.release();
        await resume.promise;
        tables.push("RefApp");
      }
      return original(document, path, options);
    };
    const first = service(client, { syncLock: locks() }).sut.setup(
      filters,
      requestor,
    );
    try {
      await entered.promise;
      const second = await service(client, { syncLock: locks() }).sut.setup(
        filters,
        requestor,
        [{ docId: "doc1", newTable: true }],
      );
      expect(second.documents[0]).toMatchObject({
        status: "error",
        error: expect.stringContaining("déjà en cours"),
      });
    } finally {
      resume.release();
    }
    expect((await first).documents[0].status).toBe("ok");

    const stale = fakeGrist();
    const lock = locks();
    const run = lock.run.bind(lock);
    const syncLock = {
      run: async (document, table, action) => {
        stale.client.request = fakeGrist({ tables: ["RefApp"] }).client.request;
        return run(document, table, action);
      },
    } as GristSyncLockService;
    expect((await setup(stale.client, { syncLock })).status).toBe("error");
  });

  it.each([
    "PUT /tables/RefApp/records",
    "POST /tables/RefApp/columns",
    "POST /apply",
  ])("libère le verrou après un échec de %s", async (failure) => {
    const { client } = fakeGrist({
      tables: ["RefApp"],
      columns: ["refapp_id"],
      failingPaths: [failure],
    });
    expect((await setup(client, { syncLock: locks() })).status).toBe("error");
    const healthy = fakeGrist({ tables: ["RefApp"] });
    expect((await setup(healthy.client, { syncLock: locks() })).status).toBe(
      "ok",
    );
  });
});
