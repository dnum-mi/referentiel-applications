import { ConflictException } from "@nestjs/common";
import type { PrismaService } from "src/prisma/prisma.service";
import type { GristClient, GristRequest } from "./grist.client";
import { GristService } from "./grist.service";

type Call = { path: string } & GristRequest;

/// Faux document Grist : répond selon la route et garde la trace des appels.
function fakeGrist({
  tables = [] as string[],
  columns = ["refapp_id", "nom", "statut"],
  resources = [] as { tableId: string; colIds: string; id: number }[],
  rules = [] as {
    id?: number;
    resource: number;
    permissionsText: string;
    aclFormula?: string;
  }[],
} = {}) {
  const calls: Call[] = [];
  let nextId = 100;
  const request = jest.fn(async (path: string, init: GristRequest = {}) => {
    calls.push({ path, ...init });
    const { method = "GET", body } = init;
    if (path === "/tables" && method === "GET")
      return { tables: tables.map((id) => ({ id })) };
    if (path === "/tables" && method === "POST") return {};
    if (path.endsWith("/columns"))
      return { columns: columns.map((id) => ({ id })) };
    if (path.endsWith("/records") && method === "PUT") return {};
    if (path.endsWith("/records")) {
      return {
        records: [
          {
            id: 7,
            fields: {
              refapp_id: "a1",
              nom: "App",
              statut: "poc",
              metadata_1: "x",
              metadata_2: null,
              metadata_3: null,
            },
          },
        ],
      };
    }
    if (path === "/sql") {
      const { sql, args } = body as { sql: string; args: unknown[] };
      if (sql.includes("JOIN")) {
        const found = rules.filter(
          (r) =>
            resources.some(
              (s) => s.id === r.resource && s.tableId === args[0],
            ) && (r.aclFormula ?? "user.Access != OWNER") !== args[1],
        );
        return { records: found.map(({ id }) => ({ id, fields: { id } })) };
      }
      if (sql.includes("_grist_ACLResources")) {
        const found = resources.filter(
          (r) => r.tableId === args[0] && r.colIds === args[1],
        );
        return { records: found.map(({ id }) => ({ id, fields: { id } })) };
      }
      const found = rules.filter(
        (r) => r.resource === args[0] && r.permissionsText === args[2],
      );
      return { records: found.map(() => ({ id: 1, fields: { id: 1 } })) };
    }
    if (path === "/apply") return { retValues: [nextId++] };
    throw new Error(`route inattendue ${method} ${path}`);
  });
  return { client: { request } as unknown as GristClient, calls };
}

function apps(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `app-${i}`,
    label: `App ${i}`,
    currentStatus: i === 0 ? null : { status: "in_production" },
  }));
}

function service(client: GristClient, applications = apps(2)) {
  const prisma = {
    application: { findMany: jest.fn().mockResolvedValue(applications) },
  } as unknown as PrismaService;
  return new GristService(client, prisma);
}

const puts = (calls: Call[]) => calls.filter((c) => c.method === "PUT");

describe("GristService.setup", () => {
  it("crée la table au premier appel, avec trois colonnes verrouillées et trois métadonnées", async () => {
    const { client, calls } = fakeGrist();
    const report = await service(client).setup();

    expect(report.tableCreated).toBe(true);
    const create = calls.find(
      (c) => c.path === "/tables" && c.method === "POST",
    );
    const columns = (
      create?.body as {
        tables: { columns: { id: string; fields: { label: string } }[] }[];
      }
    ).tables[0].columns;
    expect(columns.map((c) => c.id)).toEqual([
      "refapp_id",
      "nom",
      "statut",
      "metadata_1",
      "metadata_2",
      "metadata_3",
    ]);
    expect(columns[3].fields.label).toBe("metadata 1");
  });

  it("ne recrée pas une table existante", async () => {
    const { client, calls } = fakeGrist({ tables: ["RefApp"] });
    const report = await service(client).setup();

    expect(report.tableCreated).toBe(false);
    expect(calls.some((c) => c.path === "/tables" && c.method === "POST")).toBe(
      false,
    );
  });

  it("refuse une table existante sans refapp_id, sans rien écrire", async () => {
    const { client, calls } = fakeGrist({
      tables: ["RefApp"],
      columns: ["A", "B"],
    });

    await expect(service(client).setup()).rejects.toThrow(ConflictException);
    expect(puts(calls)).toHaveLength(0);
  });

  it("fait un upsert sur refapp_id sans jamais envoyer les métadonnées", async () => {
    const { client, calls } = fakeGrist({ tables: ["RefApp"] });
    const report = await service(client).setup();

    expect(report.rowsWritten).toBe(2);
    expect((puts(calls)[0].body as { records: unknown[] }).records).toEqual([
      { require: { refapp_id: "app-0" }, fields: { nom: "App 0", statut: "" } },
      {
        require: { refapp_id: "app-1" },
        fields: { nom: "App 1", statut: "in_production" },
      },
    ]);
  });

  it("découpe l'upsert en lots de 500", async () => {
    const { client, calls } = fakeGrist({ tables: ["RefApp"] });
    await service(client, apps(1201)).setup();

    expect(
      puts(calls).map((c) => (c.body as { records: unknown[] }).records.length),
    ).toEqual([500, 500, 201]);
  });

  it("ajoute les deux Access Rules au premier appel", async () => {
    const { client, calls } = fakeGrist();
    const report = await service(client).setup();

    expect(report.rulesAdded).toBe(2);
    const added = calls
      .filter((c) => c.path === "/apply")
      .map(
        (c) => (c.body as [string, string, null, Record<string, unknown>][])[0],
      )
      .filter(([, table]) => table === "_grist_ACLRules")
      .map(([, , , fields]) => fields.permissionsText);
    expect(added).toEqual(["-U", "-CD"]);
  });

  it("réutilise ressources et règles existantes", async () => {
    const { client, calls } = fakeGrist({
      tables: ["RefApp"],
      resources: [
        { tableId: "RefApp", colIds: "refapp_id,nom,statut", id: 1 },
        { tableId: "RefApp", colIds: "*", id: 2 },
      ],
      rules: [
        { resource: 1, permissionsText: "-U" },
        { resource: 2, permissionsText: "-CD" },
      ],
    });
    const report = await service(client).setup();

    expect(report.rulesAdded).toBe(0);
    expect(calls.some((c) => c.path === "/apply")).toBe(false);
  });

  it("supprime avant l'upsert les règles de la table qui n'exemptent pas les propriétaires", async () => {
    const { client, calls } = fakeGrist({
      tables: ["RefApp"],
      resources: [
        { tableId: "RefApp", colIds: "*", id: 3 },
        { tableId: "Autre", colIds: "*", id: 9 },
      ],
      rules: [
        { id: 30, resource: 3, permissionsText: "-CD", aclFormula: "" },
        { id: 31, resource: 3, permissionsText: "-CD" },
        { id: 90, resource: 9, permissionsText: "-CD", aclFormula: "" },
      ],
    });
    await service(client).setup();

    const removal = calls.findIndex(
      (c) =>
        c.path === "/apply" &&
        (c.body as unknown[][])[0][0] === "BulkRemoveRecord",
    );
    expect(calls[removal].body).toEqual([
      ["BulkRemoveRecord", "_grist_ACLRules", [30]],
    ]);
    expect(removal).toBeLessThan(calls.findIndex((c) => c.method === "PUT"));
  });
});

describe("GristService.records", () => {
  it("expose le rowId Grist avec les colonnes de la table", async () => {
    const { client } = fakeGrist({ tables: ["RefApp"] });
    expect(await service(client).records()).toEqual([
      {
        rowId: 7,
        refapp_id: "a1",
        nom: "App",
        statut: "poc",
        metadata_1: "x",
        metadata_2: null,
        metadata_3: null,
      },
    ]);
  });
});
