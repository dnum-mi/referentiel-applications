import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import type { ApplicationSearchDto } from "src/applications/dto/search-application.dto";
import type { ApplicationExportService } from "src/applications/export.service";
import type { PrismaService } from "src/prisma/prisma.service";
import type { Requestor } from "src/user/entities/user.entity";
import type { GristClient, GristDocument, GristRequest } from "./grist.client";
import { EXIT_REASON, GristService } from "./grist.service";
import { encryptGristApiKey } from "./grist-api-key";

process.env.GRIST_ENCRYPTION_KEY = "secret-de-test";

type Call = GristDocument & { path: string } & GristRequest;
type Row = { id: number; fields: Record<string, unknown> };
type Column = {
  id: number;
  colId: string;
  rules?: number[];
  formula?: string;
  widgetOptions?: string;
};

const ALL_COLUMNS = [
  "refapp_id",
  "nom",
  "statut",
  "dans_selection",
  "motif_sortie",
  "metadata_1",
  "metadata_2",
  "metadata_3",
];

/// Faux document Grist : répond selon la route et garde la trace des appels. `columns` vaut pour
/// toutes les tables, sauf celles décrites dans `columnsByTable` ; `failingDocs` répondent 502, comme
/// les requêtes `failingPaths` (« MÉTHODE chemin »).
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
          columns: (columnsByTable[tableId] ?? columns).map((id) => ({ id })),
        };
      }
      if (path.endsWith("/records") && method !== "GET") return {};
      if (path.endsWith("/records")) return { records: rows };
      if (path === "/sql") {
        const { sql, args } = body as { sql: string; args: unknown[] };
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
  return Array.from({ length: count }, (_, i) => ({
    id: `app-${i}`,
    label: `App ${i}`,
    currentStatus: i === 0 ? null : { status: "in_production" },
  }));
}

/// `inRefApp` : ids encore présents en base, hors sélection comprise.
function service(
  client: GristClient,
  {
    applications = apps(2),
    inRefApp = [] as string[],
    where = {} as object | null,
    docIds = ["doc1"],
    gristUrl = "https://grist.example" as string | null,
    gristApiKey = encryptGristApiKey("cle-api") as string | null,
  } = {},
) {
  const findMany = jest.fn(
    async (args: { where: { id?: { in: string[] } } }) =>
      args.where.id
        ? inRefApp
            .filter((id) => args.where.id?.in.includes(id))
            .map((id) => ({ id }))
        : applications,
  );
  const prisma = {
    application: { findMany },
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
  return {
    sut: new GristService(client, prisma, applicationExport),
    findMany,
    buildScopedWhere,
  };
}

const filters = { shortName: "app" } as ApplicationSearchDto;
const requestor = { id: "u1" } as Requestor;
/// Compte rendu de l'unique document du profil.
const setup = async (
  client: GristClient,
  options?: Parameters<typeof service>[1],
) => {
  const { documents } = await service(client, options).sut.setup(
    filters,
    requestor,
  );
  return documents[0];
};

const puts = (calls: Call[]) => calls.filter((c) => c.method === "PUT");
const patches = (calls: Call[]) => calls.filter((c) => c.method === "PATCH");
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
      dans_selection: true,
      motif_sortie: "",
      metadata_1: null,
      metadata_2: null,
      metadata_3: null,
      ...fields,
    },
  };
}

describe("GristService.setup", () => {
  it("crée la table au premier appel, avec les colonnes verrouillées et trois métadonnées", async () => {
    const { client, calls } = fakeGrist();
    const report = await setup(client);

    expect(report.tableCreated).toBe(true);
    const create = calls.find(
      (c) => c.path === "/tables" && c.method === "POST",
    );
    const columns = (
      create?.body as {
        tables: {
          columns: { id: string; fields: { label: string; type: string } }[];
        }[];
      }
    ).tables[0].columns;
    expect(columns.map((c) => c.id)).toEqual(ALL_COLUMNS);
    expect(columns[3].fields.type).toBe("Bool");
    expect(columns[5].fields.label).toBe("metadata 1");
  });

  it("ne recrée pas une table existante", async () => {
    const { client, calls } = fakeGrist({ tables: ["RefApp"] });
    const report = await setup(client);

    expect(report.tableCreated).toBe(false);
    expect(calls.some((c) => c.path === "/tables" && c.method === "POST")).toBe(
      false,
    );
  });

  it("ajoute à une table existante les colonnes qui lui manquent", async () => {
    const { client, calls } = fakeGrist({
      tables: ["RefApp"],
      columns: ["refapp_id", "nom", "statut", "metadata_1"],
    });
    await setup(client);

    const added = calls.find(
      (c) => c.path === "/tables/RefApp/columns" && c.method === "POST",
    );
    expect(
      (added?.body as { columns: { id: string }[] }).columns.map((c) => c.id),
    ).toEqual(["dans_selection", "motif_sortie", "metadata_2", "metadata_3"]);
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
    const { sut, findMany, buildScopedWhere } = service(client, { where });
    await sut.setup(filters, requestor);

    expect(buildScopedWhere).toHaveBeenCalledWith(filters, requestor);
    expect(findMany.mock.calls[0][0].where).toBe(where);
  });

  it("n'écrit aucune application si le demandeur ne peut en lire aucune", async () => {
    const { client, calls } = fakeGrist({ tables: ["RefApp"] });
    const report = await setup(client, { where: null });

    expect(report.rowsWritten).toBe(0);
    expect(puts(calls)).toHaveLength(0);
  });

  it("fait un upsert sur refapp_id qui dégrise, sans jamais envoyer les métadonnées", async () => {
    const { client, calls } = fakeGrist({ tables: ["RefApp"] });
    const report = await setup(client);

    expect(report.rowsWritten).toBe(2);
    expect((puts(calls)[0].body as { records: unknown[] }).records).toEqual([
      {
        require: { refapp_id: "app-0" },
        fields: {
          nom: "App 0",
          statut: "",
          dans_selection: true,
          motif_sortie: "",
        },
      },
      {
        require: { refapp_id: "app-1" },
        fields: {
          nom: "App 1",
          statut: "in_production",
          dans_selection: true,
          motif_sortie: "",
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

    expect(report).toMatchObject({ rowsGreyed: 0, rowsDeleted: 0 });
    expect(patches(calls)).toHaveLength(0);
  });

  it("grise une ligne sortie du filtre qui porte des métadonnées", async () => {
    const { client, calls } = fakeGrist({
      tables: ["RefApp"],
      rows: [row(7, "old", { metadata_2: "note" })],
    });
    const report = await setup(client, { inRefApp: ["old"] });

    expect(report).toMatchObject({ rowsGreyed: 1, rowsDeleted: 0 });
    expect(patches(calls)[0].body).toEqual({
      records: [
        {
          id: 7,
          fields: {
            dans_selection: false,
            motif_sortie: EXIT_REASON.outOfFilter,
          },
        },
      ],
    });
  });

  it("indique qu'une application grisée a été supprimée de RefApp", async () => {
    const { client, calls } = fakeGrist({
      tables: ["RefApp"],
      rows: [
        row(7, "gone", {
          metadata_1: "note",
          dans_selection: false,
          motif_sortie: EXIT_REASON.outOfFilter,
        }),
      ],
    });
    await setup(client);

    expect(patches(calls)[0].body).toEqual({
      records: [
        {
          id: 7,
          fields: { dans_selection: false, motif_sortie: EXIT_REASON.deleted },
        },
      ],
    });
  });

  it("ne réécrit pas une ligne déjà grisée avec le bon motif", async () => {
    const { client, calls } = fakeGrist({
      tables: ["RefApp"],
      rows: [
        row(7, "old", {
          metadata_1: "note",
          dans_selection: false,
          motif_sortie: EXIT_REASON.outOfFilter,
        }),
      ],
    });
    const report = await setup(client, { inRefApp: ["old"] });

    expect(report.rowsGreyed).toBe(1);
    expect(patches(calls)).toHaveLength(0);
  });

  it("supprime les lignes sorties sans métadonnées, espaces seuls compris", async () => {
    const { client, calls } = fakeGrist({
      tables: ["RefApp"],
      rows: [row(7, "old"), row(8, "gone", { metadata_3: "  " })],
    });
    const report = await setup(client, { inRefApp: ["old"] });

    expect(report).toMatchObject({ rowsGreyed: 0, rowsDeleted: 2 });
    expect(applied(calls)).toContainEqual([
      "BulkRemoveRecord",
      "RefApp",
      [7, 8],
    ]);
    expect(patches(calls)).toHaveLength(0);
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

  it("grise par style conditionnel les colonnes qui ne le sont pas encore", async () => {
    const { client, calls } = fakeGrist({
      tables: ["RefApp"],
      metaColumns: [
        { id: 1, colId: "manualSort" },
        {
          id: 2,
          colId: "nom",
          rules: [5],
          widgetOptions: JSON.stringify({
            alignment: "left",
            rulesOptions: [{ textColor: "#FF0000" }],
          }),
        },
        { id: 3, colId: "statut", rules: [6] },
        { id: 5, colId: "gristHelper_ConditionalRule", formula: "$x > 1" },
        {
          id: 6,
          colId: "gristHelper_ConditionalRule2",
          formula: "not $dans_selection",
        },
      ],
    });
    await setup(client);

    const actions = applied(calls);
    expect(actions).toContainEqual(["AddEmptyRule", "RefApp", 0, 2]);
    expect(actions.filter(([a]) => a === "AddEmptyRule")).toHaveLength(1);
    const helper = actions.find(
      ([a, , , fields]) =>
        a === "UpdateRecord" &&
        (fields as { formula?: string }).formula !== undefined,
    );
    expect(helper?.[3]).toEqual({ formula: "not $dans_selection" });
    const styled = actions.find(
      ([a, table, id]) =>
        a === "UpdateRecord" && table === "_grist_Tables_column" && id === 2,
    );
    expect(
      JSON.parse((styled?.[3] as { widgetOptions: string }).widgetOptions),
    ).toEqual({
      alignment: "left",
      rulesOptions: [
        { textColor: "#FF0000" },
        { textColor: "#929292", fillColor: "#EEEEEE" },
      ],
    });
  });

  it("remet le verrou pour tous une fois les lignes écrites, grisées et stylées", async () => {
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
      c.method === "PATCH" ||
      ["AddEmptyRule", "UpdateRecord"].includes(firstAction(c)[0] as string);

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

  it("réutilise les ressources existantes", async () => {
    const { client, calls } = fakeGrist({
      tables: ["RefApp"],
      resources: [
        {
          tableId: "RefApp",
          colIds: "refapp_id,nom,statut,dans_selection,motif_sortie",
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
  it("expose le rowId Grist avec les colonnes de la table", async () => {
    const { client } = fakeGrist({
      tables: ["RefApp"],
      rows: [row(7, "a1", { nom: "App", statut: "poc", metadata_1: "x" })],
    });
    expect(await service(client).sut.records("doc1", requestor)).toEqual([
      {
        rowId: 7,
        refapp_id: "a1",
        nom: "App",
        statut: "poc",
        dans_selection: true,
        motif_sortie: "",
        metadata_1: "x",
        metadata_2: null,
        metadata_3: null,
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
    const { sut, findMany } = service(client, { docIds: ["doc1", "doc2"] });
    const { documents } = await sut.setup(filters, requestor);

    expect(documents.map(({ docId, status }) => ({ docId, status }))).toEqual([
      { docId: "doc1", status: "ok" },
      { docId: "doc2", status: "ok" },
    ]);
    expect(findMany).toHaveBeenCalledTimes(1);
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
