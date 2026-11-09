import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Permission, Roles, type Prisma } from "@prisma/client";
import * as ExcelJS from "exceljs";
import request from "supertest";
import { SBOM_LIMITS } from "src/sbom/sbom-limits";
import { SbomService } from "src/sbom/sbom.service";
import { ActorTypeFaker } from "./fakers/actor-type.faker";
import { getPrismaClient } from "./fakers/prisma";
import { UserFaker, type UserFakerReturnType } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

interface Preview {
  id: string;
  totalComponents: number;
  unchanged: boolean;
  counts: {
    added: number;
    removed: number;
    changed: number;
    unchanged: number;
  };
}

interface Commit {
  id: string;
  sourceId: string;
  revision: number;
  unchanged: boolean;
}

interface Component {
  id: string;
  ref: string;
  product: string;
  version: string | null;
  sourceName: string;
}

interface Inventory {
  total: number;
  results: Component[];
}

function document(versions = ["1.0.0"], product = "sbom-test-package") {
  const components = versions.map((version) => ({
    type: "library",
    name: product,
    version,
    purl: `pkg:npm/${product}@${version}`,
    "bom-ref": `${product}-${version}`,
  }));
  return {
    bomFormat: "CycloneDX",
    specVersion: "1.6",
    version: 1,
    components,
    dependencies: components.map((component) => ({
      ref: component["bom-ref"],
      dependsOn: [],
    })),
  };
}

describe("SBOM — parcours HTTP et transactions PostgreSQL (#3219)", () => {
  const app = setupTestSuite();
  const prisma = getPrismaClient();
  const prefix = `sbom-e2e-${randomUUID()}`;
  let admin: UserFakerReturnType;

  beforeAll(async () => {
    admin = await UserFaker.create({ role: Roles.ADMIN });
  });

  async function makeApplication(suffix: string, organizationId?: string) {
    const application = await prisma.application.create({
      data: {
        label: `${prefix}-${suffix}`,
        description: "Application fictive de qualification SBOM",
        quality: 100,
        ...(organizationId ? { actors: { create: { organizationId } } } : {}),
      },
    });
    const status = await prisma.applicationStatus.create({
      data: { applicationId: application.id, status: "in_production" },
    });
    await prisma.application.update({
      where: { id: application.id },
      data: { currentStatusId: status.id },
    });
    return application;
  }

  function upload(
    applicationId: string,
    sourceName: string,
    content: Buffer | object = document(),
    user = admin,
  ) {
    return request(app().getHttpServer())
      .post(`/applications/${applicationId}/sbom-imports/preview`)
      .set("Authorization", `Bearer ${getToken(user)}`)
      .field("sourceName", sourceName)
      .attach(
        "file",
        Buffer.isBuffer(content)
          ? content
          : Buffer.from(JSON.stringify(content)),
        {
          filename: "inventory.json",
          contentType: "application/json",
        },
      );
  }

  async function preview(
    applicationId: string,
    sourceName: string,
    content: Buffer | object = document(),
    user = admin,
  ) {
    return (await upload(applicationId, sourceName, content, user).expect(200))
      .body as Preview;
  }

  function commitRequest(
    applicationId: string,
    importId: string,
    user = admin,
  ) {
    return request(app().getHttpServer())
      .post(`/applications/${applicationId}/sbom-imports/${importId}/commit`)
      .set("Authorization", `Bearer ${getToken(user)}`);
  }

  async function importDocument(
    applicationId: string,
    sourceName: string,
    content: Buffer | object = document(),
  ) {
    const analyzed = await preview(applicationId, sourceName, content);
    const committed = (
      await commitRequest(applicationId, analyzed.id).expect(200)
    ).body as Commit;
    return { analyzed, committed };
  }

  function listComponents(applicationId: string, user = admin) {
    return request(app().getHttpServer())
      .get(`/applications/${applicationId}/software-components`)
      .set("Authorization", `Bearer ${getToken(user)}`);
  }

  function sourceRequest(
    applicationId: string,
    sourceId: string,
    user = admin,
  ) {
    return request(app().getHttpServer())
      .patch(`/applications/${applicationId}/sbom-sources/${sourceId}`)
      .set("Authorization", `Bearer ${getToken(user)}`);
  }

  function binaryDownload(
    url: string,
    user = admin,
    query: Record<string, string | number> = {},
  ) {
    return request(app().getHttpServer())
      .get(url)
      .set("Authorization", `Bearer ${getToken(user)}`)
      .query(query)
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => callback(null, Buffer.concat(chunks)));
      });
  }

  async function readTechnologies(response: request.Response) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(response.body as ArrayBuffer);
    const sheet = workbook.getWorksheet("Technologies")!;
    const rows: string[][] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1)
        rows.push(
          Array.from({ length: 12 }, (_, index) => row.getCell(index + 1).text),
        );
    });
    return { rows, workbook };
  }

  it.each(["cyclonedx-1.5", "cyclonedx-1.6", "cyclonedx-1.7", "spdx-2.3"])(
    "prévisualise puis confirme le format %s sans effet d'inventaire avant confirmation",
    async (fixture) => {
      const application = await makeApplication(fixture);
      const content = readFileSync(
        join(__dirname, "../src/sbom/fixtures", `${fixture}.json`),
      );
      const analyzed = await preview(application.id, "backend", content);
      expect(analyzed.totalComponents).toBeGreaterThanOrEqual(3);
      expect(analyzed.counts.added).toBe(analyzed.totalComponents);
      expect(
        await prisma.sbomSource.count({
          where: { applicationId: application.id },
        }),
      ).toBe(0);
      expect(
        await prisma.sbomComponent.count({ where: { importId: analyzed.id } }),
      ).toBe(0);
      expect(
        await prisma.inventoryEvent.count({
          where: { applicationId: application.id },
        }),
      ).toBe(0);
      expect((await listComponents(application.id).expect(200)).body).toEqual({
        total: 0,
        results: [],
      });

      const committed = (
        await commitRequest(application.id, analyzed.id).expect(200)
      ).body as Commit;
      expect(committed).toMatchObject({
        id: analyzed.id,
        revision: 1,
        unchanged: false,
      });
      const inventory = (
        await listComponents(application.id)
          .query({ pageSize: 100 })
          .expect(200)
      ).body as Inventory;
      expect(inventory.total).toBe(analyzed.totalComponents);
      expect(inventory.results).toHaveLength(analyzed.totalComponents);
      expect(
        inventory.results
          .filter((component) => component.product === "express")
          .map((component) => component.version)
          .sort(),
      ).toEqual(["4.21.0", "5.1.0"]);
      expect(
        inventory.results.every(
          (component) => component.sourceName === "backend",
        ),
      ).toBe(true);
      const detail = await request(app().getHttpServer())
        .get(`/applications/${application.id}/sbom-imports/${analyzed.id}`)
        .set("Authorization", `Bearer ${getToken(admin)}`)
        .expect(200);
      expect(detail.body.relations.length).toBeGreaterThan(0);
      const event = await prisma.inventoryEvent.findFirstOrThrow({
        where: { applicationId: application.id },
      });
      expect(event).toMatchObject({
        type: "inventory.changed",
        revision: 1,
        processedAt: null,
      });
      expect(event.payload).toMatchObject({
        importId: analyzed.id,
        actorId: admin.id,
        action: "import",
      });
    },
  );

  it("rend le commit idempotent et ne réémet rien pour un nouvel import identique", async () => {
    const application = await makeApplication("idempotent");
    const first = await importDocument(application.id, "backend");
    const repeat = await commitRequest(
      application.id,
      first.analyzed.id,
    ).expect(200);
    expect(repeat.body).toEqual(first.committed);
    const second = await preview(application.id, "backend");
    expect(second.unchanged).toBe(true);
    const unchanged = await commitRequest(application.id, second.id).expect(
      200,
    );
    expect(unchanged.body).toMatchObject({ revision: 1, unchanged: true });
    const source = await prisma.sbomSource.findUniqueOrThrow({
      where: { id: first.committed.sourceId },
    });
    expect(source.currentImportId).toBe(first.analyzed.id);
    expect(source.revision).toBe(1);
    expect(
      await prisma.sbomComponent.count({
        where: { import: { applicationId: application.id } },
      }),
    ).toBe(1);
    expect(
      await prisma.inventoryEvent.count({
        where: { applicationId: application.id },
      }),
    ).toBe(1);
    const history = await request(app().getHttpServer())
      .get(`/applications/${application.id}/sbom-sources`)
      .set("Authorization", `Bearer ${getToken(admin)}`)
      .expect(200);
    expect(
      history.body[0].imports
        .map((record: { status: string }) => record.status)
        .sort(),
    ).toEqual(["committed", "unchanged"]);
  });

  it("attribue la confirmation et l'événement à son auteur sans changer l'auteur de l'analyse", async () => {
    const application = await makeApplication("audit");
    const reviewer = await UserFaker.create({ role: Roles.ADMIN });
    const analyzed = await preview(application.id, "backend");
    await commitRequest(application.id, analyzed.id, reviewer).expect(200);
    const imported = await prisma.sbomImport.findUniqueOrThrow({
      where: { id: analyzed.id },
    });
    expect(imported.createdBy).toBe(admin.id);
    expect(imported.committedBy).toBe(reviewer.id);
    const event = await prisma.inventoryEvent.findFirstOrThrow({
      where: { applicationId: application.id },
    });
    expect(event.payload).toMatchObject({ actorId: reviewer.id });
    await commitRequest(application.id, analyzed.id, admin).expect(200);
    expect(
      (
        await prisma.sbomImport.findUniqueOrThrow({
          where: { id: analyzed.id },
        })
      ).committedBy,
    ).toBe(reviewer.id);
    expect(
      await prisma.inventoryEvent.count({
        where: { applicationId: application.id },
      }),
    ).toBe(1);
  });

  it("compacte un import inchangé et restitue son snapshot historique après remplacement", async () => {
    const application = await makeApplication("snapshot");
    const first = await importDocument(
      application.id,
      "backend",
      document(["1.0.0"]),
    );
    const second = await importDocument(
      application.id,
      "backend",
      document(["1.0.0"]),
    );
    expect(second.committed.unchanged).toBe(true);
    const record = await prisma.sbomImport.findUniqueOrThrow({
      where: { id: second.analyzed.id },
    });
    expect(record.document).toMatchObject({
      snapshotImportId: first.analyzed.id,
      components: [],
      relations: [],
    });
    expect(record.fileHash).toHaveLength(64);
    expect(record.createdBy).toBe(admin.id);
    expect(record.committedBy).toBe(admin.id);
    expect(record.committedAt).not.toBeNull();
    await importDocument(application.id, "backend", document(["2.0.0"]));
    const detail = await request(app().getHttpServer())
      .get(`/applications/${application.id}/sbom-imports/${second.analyzed.id}`)
      .set("Authorization", `Bearer ${getToken(admin)}`)
      .expect(200);
    expect(detail.body.status).toBe("unchanged");
    expect(detail.body.totalComponents).toBe(1);
    expect(
      detail.body.components.map(
        (component: { version: string }) => component.version,
      ),
    ).toEqual(["1.0.0"]);
    const current = (await listComponents(application.id).expect(200))
      .body as Inventory;
    expect(current.results.map((component) => component.version)).toEqual([
      "2.0.0",
    ]);
    expect(
      await prisma.inventoryEvent.count({
        where: { applicationId: application.id },
      }),
    ).toBe(2);
  });

  it("borne l'aperçu d'historique à vingt entrées et pagine toutes les confirmations autorisées", async () => {
    const application = await makeApplication("history-pages");
    const first = await importDocument(application.id, "backend");
    const confirmedIds = [first.analyzed.id];
    for (let index = 0; index < 21; index++) {
      const next = await importDocument(application.id, "backend");
      confirmedIds.push(next.analyzed.id);
    }
    const pending = await preview(application.id, "backend");
    const sourceList = await request(app().getHttpServer())
      .get(`/applications/${application.id}/sbom-sources`)
      .set("Authorization", `Bearer ${getToken(admin)}`)
      .expect(200);
    expect(sourceList.body[0].importCount).toBe(22);
    expect(sourceList.body[0].imports).toHaveLength(20);
    const path = `/applications/${application.id}/sbom-sources/${first.committed.sourceId}/imports`;
    const allIds: string[] = [];
    for (const page of [0, 1, 2]) {
      const response = await request(app().getHttpServer())
        .get(path)
        .set("Authorization", `Bearer ${getToken(admin)}`)
        .query({ page, pageSize: 10 })
        .expect(200);
      expect(response.body.total).toBe(22);
      expect(response.body.results).toHaveLength(page === 2 ? 2 : 10);
      allIds.push(
        ...response.body.results.map((record: { id: string }) => record.id),
      );
    }
    expect(allIds.sort()).toEqual(confirmedIds.sort());
    expect(allIds).not.toContain(pending.id);
    const other = await makeApplication("history-idor");
    await request(app().getHttpServer())
      .get(
        `/applications/${other.id}/sbom-sources/${first.committed.sourceId}/imports`,
      )
      .set("Authorization", `Bearer ${getToken(admin)}`)
      .expect(404);
    const visitor = await UserFaker.create({ role: Roles.VISITOR });
    await request(app().getHttpServer())
      .get(path)
      .set("Authorization", `Bearer ${getToken(visitor)}`)
      .expect(403);
  });

  it("purge au plus cent analyses expirées par passage et conserve les imports confirmés", async () => {
    const application = await makeApplication("retention");
    const committed = await importDocument(application.id, "backend");
    const unchanged = await importDocument(application.id, "backend");
    const future = await preview(application.id, "backend");
    await prisma.sbomImport.updateMany({
      where: { id: { in: [committed.analyzed.id, unchanged.analyzed.id] } },
      data: { expiresAt: new Date(0) },
    });
    const template = await prisma.sbomImport.findUniqueOrThrow({
      where: { id: future.id },
    });
    const expired = Array.from({ length: 101 }, (_, index) => ({
      ...template,
      id: randomUUID(),
      expiresAt: new Date(-200_000 + index),
      document: template.document as Prisma.InputJsonValue,
      report: template.report as Prisma.InputJsonValue,
    }));
    await prisma.sbomImport.createMany({ data: expired });
    await commitRequest(application.id, expired[0].id).expect(410);
    const service = app().get(SbomService);
    expect(await service.cleanupExpiredPreviews()).toEqual({ count: 100 });
    expect(
      await prisma.sbomImport.count({
        where: { id: { in: expired.map((record) => record.id) } },
      }),
    ).toBe(1);
    await commitRequest(application.id, expired[0].id).expect(404);
    await service.cleanupExpiredPreviews();
    expect(
      await prisma.sbomImport.count({
        where: { id: { in: expired.map((record) => record.id) } },
      }),
    ).toBe(0);
    expect(
      await prisma.sbomImport.count({
        where: {
          id: { in: [future.id, committed.analyzed.id, unchanged.analyzed.id] },
        },
      }),
    ).toBe(3);
    expect((await listComponents(application.id).expect(200)).body.total).toBe(
      1,
    );
    expect(
      await prisma.inventoryEvent.count({
        where: { applicationId: application.id },
      }),
    ).toBe(1);
  });

  it("garde provenance et composants exclus dans le détail sans les projeter dans l'inventaire ni ses changements", async () => {
    const application = await makeApplication("component-contexts");
    const product = `inventory-${randomUUID()}`;
    const input = document(["1.0.0"], product);
    const contextualDocument = {
      ...input,
      metadata: {
        tools: {
          components: [
            {
              type: "application",
              name: `${product}-scanner`,
              version: "9.0.0",
              "bom-ref": "tool",
            },
          ],
        },
      },
      components: [
        {
          ...input.components[0],
          pedigree: {
            ancestors: [
              {
                type: "library",
                name: `${product}-ancestor`,
                version: "0.1.0",
                "bom-ref": "ancestor",
              },
            ],
          },
        },
        {
          type: "library",
          name: `${product}-excluded`,
          version: "1.0.0",
          scope: "excluded",
          "bom-ref": "excluded",
          components: [
            {
              type: "library",
              name: `${product}-excluded-child`,
              version: "1.0.0",
              "bom-ref": "excluded-child",
            },
          ],
        },
      ],
    };
    const { analyzed } = await importDocument(
      application.id,
      "backend",
      contextualDocument,
    );
    expect(analyzed.totalComponents).toBe(1);
    expect(analyzed.counts).toEqual({
      added: 1,
      removed: 0,
      changed: 0,
      unchanged: 0,
    });
    const detail = await request(app().getHttpServer())
      .get(`/applications/${application.id}/sbom-imports/${analyzed.id}`)
      .set("Authorization", `Bearer ${getToken(admin)}`)
      .expect(200);
    expect(detail.body.components).toHaveLength(5);
    expect(
      detail.body.components
        .map((component: { context: string }) => component.context)
        .sort(),
    ).toEqual([
      "excluded",
      "excluded",
      "inventory",
      "provenance",
      "provenance",
    ]);
    expect(
      await prisma.sbomComponent.count({ where: { importId: analyzed.id } }),
    ).toBe(1);
    const current = (await listComponents(application.id).expect(200))
      .body as Inventory;
    expect(current.results.map((component) => component.product)).toEqual([
      product,
    ]);
    const projection = await request(app().getHttpServer())
      .get("/technologies/end-of-life")
      .set("Authorization", `Bearer ${getToken(admin)}`)
      .query({ status: "all", search: product })
      .expect(200);
    expect(projection.body.total).toBe(1);
    expect(projection.body.results[0].technologies).toHaveLength(1);
    expect(projection.body.results[0].technologies[0].product).toBe(product);
    await request(app().getHttpServer())
      .get("/technologies/end-of-life")
      .set("Authorization", `Bearer ${getToken(admin)}`)
      .query({ status: "all", search: `${product}-scanner` })
      .expect(200, { total: 0, results: [] });
    const event = await prisma.inventoryEvent.findFirstOrThrow({
      where: { applicationId: application.id },
    });
    const payload = JSON.stringify(event.payload);
    expect(payload).toContain(product);
    for (const suffix of ["scanner", "ancestor", "excluded"])
      expect(payload).not.toContain(`${product}-${suffix}`);

    const provenanceChanged = {
      ...contextualDocument,
      metadata: {
        tools: {
          components: [
            {
              type: "application",
              name: `${product}-scanner`,
              version: "10.0.0",
              "bom-ref": "tool",
            },
          ],
        },
      },
    };
    const changed = await importDocument(
      application.id,
      "backend",
      provenanceChanged,
    );
    expect(changed.analyzed.counts).toEqual({
      added: 0,
      removed: 0,
      changed: 0,
      unchanged: 1,
    });
    expect(changed.committed.unchanged).toBe(false);
    const events = await prisma.inventoryEvent.findMany({
      where: { applicationId: application.id },
      orderBy: { revision: "asc" },
    });
    expect(events).toHaveLength(2);
    expect(events[1].payload).toMatchObject({
      changes: { added: [], removed: [], changed: [], unchanged: 1 },
    });
    expect(JSON.stringify(events[1].payload)).not.toContain(
      `${product}-scanner`,
    );
  });

  it("préserve versions coexistantes, autres sources et saisie manuelle lors d'un remplacement", async () => {
    const application = await makeApplication("replace");
    const manual = await prisma.technologyStack.create({
      data: {
        applicationId: application.id,
        technology: "Bibliothèque",
        product: "sbom-test-package",
        version: "manual",
      },
    });
    const first = await importDocument(
      application.id,
      "backend",
      document(["1.0.0", "2.0.0"]),
    );
    await importDocument(application.id, "frontend", document(["1.0.0"]));
    const replacement = await preview(
      application.id,
      "backend",
      document(["2.0.0", "3.0.0"]),
    );
    expect(replacement.counts).toEqual({
      added: 0,
      removed: 0,
      changed: 1,
      unchanged: 1,
    });
    await commitRequest(application.id, replacement.id).expect(200);
    const current = (await listComponents(application.id).expect(200))
      .body as Inventory;
    expect(current.total).toBe(3);
    expect(
      current.results.map((row) => `${row.sourceName}:${row.version}`).sort(),
    ).toEqual(["backend:2.0.0", "backend:3.0.0", "frontend:1.0.0"]);
    expect(
      await prisma.technologyStack.findUnique({ where: { id: manual.id } }),
    ).toEqual(manual);
    expect(
      await prisma.sbomComponent.count({
        where: { importId: first.analyzed.id },
      }),
    ).toBe(2);
    const page = (
      await listComponents(application.id)
        .query({ page: 1, pageSize: 1, search: "sbom-test-package" })
        .expect(200)
    ).body as Inventory;
    expect(page.total).toBe(3);
    expect(page.results).toHaveLength(1);
    expect(
      (
        await prisma.sbomInventory.findUniqueOrThrow({
          where: { applicationId: application.id },
        })
      ).revision,
    ).toBe(3);
  });

  it("prévisualise les retraits, désactive/réactive la source et garde un historique durable", async () => {
    const application = await makeApplication("activation");
    const imported = await importDocument(
      application.id,
      "backend",
      document(["1.0.0", "2.0.0"]),
    );
    const sourceId = imported.committed.sourceId;
    const impact = await sourceRequest(application.id, sourceId)
      .send({ active: false, revision: 1, preview: true })
      .expect(200);
    expect(impact.body).toEqual({ removed: 2, added: 0, revision: 1 });
    expect((await listComponents(application.id).expect(200)).body.total).toBe(
      2,
    );
    await sourceRequest(application.id, sourceId)
      .send({ active: false, revision: 1 })
      .expect(200);
    expect((await listComponents(application.id).expect(200)).body.total).toBe(
      0,
    );
    await sourceRequest(application.id, sourceId)
      .send({ active: true, revision: 1 })
      .expect(409);
    await sourceRequest(application.id, sourceId)
      .send({ active: true, revision: 2, preview: true })
      .expect(200, { removed: 0, added: 2, revision: 2 });
    await sourceRequest(application.id, sourceId)
      .send({ active: true, revision: 2 })
      .expect(200);
    expect((await listComponents(application.id).expect(200)).body.total).toBe(
      2,
    );
    const events = await prisma.inventoryEvent.findMany({
      where: { applicationId: application.id },
      orderBy: { revision: "asc" },
    });
    expect(events.map((event) => event.revision)).toEqual([1, 2, 3]);
    expect(
      events.map((event) => (event.payload as { action: string }).action),
    ).toEqual(["import", "deactivate", "activate"]);
    expect(events.every((event) => event.processedAt === null)).toBe(true);
    const source = await prisma.sbomSource.findUniqueOrThrow({
      where: { id: sourceId },
    });
    expect(source.currentImportId).toBe(imported.analyzed.id);
    expect(
      await prisma.sbomImport.count({
        where: { sourceId, status: "committed" },
      }),
    ).toBe(1);
  });

  it("refuse une analyse expirée et sérialise deux confirmations concurrentes", async () => {
    const application = await makeApplication("concurrent");
    const expired = await preview(application.id, "expired");
    await prisma.sbomImport.update({
      where: { id: expired.id },
      data: { expiresAt: new Date(0) },
    });
    await commitRequest(application.id, expired.id).expect(410);
    expect(
      await prisma.sbomSource.count({
        where: { applicationId: application.id },
      }),
    ).toBe(0);

    const first = await preview(application.id, "backend", document(["1.0.0"]));
    const second = await preview(
      application.id,
      "backend",
      document(["2.0.0"]),
    );
    const responses = await Promise.all([
      commitRequest(application.id, first.id),
      commitRequest(application.id, second.id),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 409,
    ]);
    expect(
      await prisma.sbomSource.count({
        where: { applicationId: application.id },
      }),
    ).toBe(1);
    expect(
      await prisma.inventoryEvent.count({
        where: { applicationId: application.id },
      }),
    ).toBe(1);
    expect((await listComponents(application.id).expect(200)).body.total).toBe(
      1,
    );
  });

  it("annule composants, source et événement ensemble si PostgreSQL refuse l'outbox", async () => {
    const application = await makeApplication("rollback");
    const analyzed = await preview(application.id, "backend");
    // Injection de panne dans la base de TEST : l'échec arrive après insertion des composants.
    await prisma.$executeRawUnsafe(
      `CREATE FUNCTION sbom_test_fail_outbox() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'SBOM_TEST_OUTBOX_FAILURE'; END; $$`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE TRIGGER sbom_test_outbox_failure BEFORE INSERT ON "InventoryEvent" FOR EACH ROW EXECUTE FUNCTION sbom_test_fail_outbox()`,
    );
    try {
      await commitRequest(application.id, analyzed.id).expect(500);
      expect(
        await prisma.sbomSource.count({
          where: { applicationId: application.id },
        }),
      ).toBe(0);
      expect(
        await prisma.sbomComponent.count({ where: { importId: analyzed.id } }),
      ).toBe(0);
      expect(
        await prisma.inventoryEvent.count({
          where: { applicationId: application.id },
        }),
      ).toBe(0);
      expect(
        await prisma.sbomInventory.findUnique({
          where: { applicationId: application.id },
        }),
      ).toBeNull();
      expect(
        (
          await prisma.sbomImport.findUniqueOrThrow({
            where: { id: analyzed.id },
          })
        ).status,
      ).toBe("preview");
    } finally {
      await prisma.$executeRawUnsafe(
        `DROP TRIGGER sbom_test_outbox_failure ON "InventoryEvent"`,
      );
      await prisma.$executeRawUnsafe(`DROP FUNCTION sbom_test_fail_outbox()`);
    }
    await commitRequest(application.id, analyzed.id).expect(200);
    expect((await listComponents(application.id).expect(200)).body.total).toBe(
      1,
    );
  });

  it("borne les identifiants d'import et de source à l'application de la route", async () => {
    const owner = await makeApplication("idor-owner");
    const other = await makeApplication("idor-other");
    const analyzed = await preview(owner.id, "backend");
    await commitRequest(other.id, analyzed.id).expect(404);
    await request(app().getHttpServer())
      .get(`/applications/${other.id}/sbom-imports/${analyzed.id}`)
      .set("Authorization", `Bearer ${getToken(admin)}`)
      .expect(404);
    const committed = (await commitRequest(owner.id, analyzed.id).expect(200))
      .body as Commit;
    await sourceRequest(other.id, committed.sourceId)
      .send({ active: false, revision: 1 })
      .expect(404);
    expect((await listComponents(other.id).expect(200)).body.total).toBe(0);
    expect((await listComponents(owner.id).expect(200)).body.total).toBe(1);
  });

  it("revérifie TechnologyWrite au commit et refuse les routes SBOM sans les droits requis", async () => {
    const application = await makeApplication("permissions");
    const outside = await makeApplication("permissions-outside");
    const user = await UserFaker.create({ role: Roles.VISITOR });
    const actorType = await ActorTypeFaker.create([
      Permission.TechnologyRead,
      Permission.TechnologyWrite,
    ]);
    await prisma.actor.create({
      data: {
        applicationId: application.id,
        email: user.email,
        actorTypeId: actorType.id,
      },
    });
    const analyzed = await preview(application.id, "backend", document(), user);
    await prisma.appPermissions.update({
      where: { actorTypeId: actorType.id },
      data: { TechnologyWrite: false },
    });
    await commitRequest(application.id, analyzed.id, user).expect(403);
    await upload(application.id, "other", document(), user).expect(403);
    await listComponents(outside.id, user).expect(403);
    await commitRequest(outside.id, analyzed.id, user).expect(403);
    expect(
      await prisma.sbomSource.count({
        where: { applicationId: application.id },
      }),
    ).toBe(0);
    await listComponents(application.id, user).expect(200);
    await prisma.appPermissions.update({
      where: { actorTypeId: actorType.id },
      data: { TechnologyRead: false },
    });
    for (const suffix of [
      "software-components",
      "sbom-sources",
      `sbom-imports/${analyzed.id}`,
    ]) {
      await request(app().getHttpServer())
        .get(`/applications/${application.id}/${suffix}`)
        .set("Authorization", `Bearer ${getToken(user)}`)
        .expect(403);
    }
    await request(app().getHttpServer())
      .get(`/applications/${application.id}/software-components`)
      .expect(401);
  });

  it("refuse fichiers absents, JSON invalide, format non pris en charge et dépassement de transport", async () => {
    const application = await makeApplication("invalid-upload");
    await request(app().getHttpServer())
      .post(`/applications/${application.id}/sbom-imports/preview`)
      .set("Authorization", `Bearer ${getToken(admin)}`)
      .field("sourceName", "backend")
      .expect(400);
    await upload(application.id, "backend", Buffer.from("not-json")).expect(
      400,
    );
    await upload(application.id, "backend", {
      bomFormat: "CycloneDX",
      specVersion: "1.4",
      version: 1,
    }).expect(415);
    await upload(application.id, " ", document()).expect(400);
    await upload(
      application.id,
      "backend",
      Buffer.alloc(SBOM_LIMITS.maxBytes + 1, 32),
    ).expect(413);
    await upload(application.id, "backend", document())
      .attach("file", Buffer.from("{}"), "second.json")
      .expect(400);
    expect(
      await prisma.sbomImport.count({
        where: { applicationId: application.id },
      }),
    ).toBe(0);
    expect(
      await prisma.inventoryEvent.count({
        where: { applicationId: application.id },
      }),
    ).toBe(0);
  });

  it("projette uniquement les inventaires actifs autorisés avant pagination et exclut les filtres EOL", async () => {
    const scope = await prisma.organization.create({
      data: { path: `/${prefix}/scope` },
    });
    const child = await prisma.organization.create({
      data: { path: `/${prefix}/scope/child`, parentId: scope.id },
    });
    const outside = await prisma.organization.create({
      data: { path: `/${prefix}/scope-other` },
    });
    const reader = await UserFaker.create({
      role: Roles.READER,
      additionalPermissions: [Permission.TechnologyList, Permission.DataExport],
    });
    await reader.update({ scopeOrganization: { connect: { id: scope.id } } });
    const marker = `needle-${randomUUID()}`;
    const direct = await makeApplication("view-a", scope.id);
    const descendant = await makeApplication("view-b", child.id);
    const unauthorized = await makeApplication("view-outside", outside.id);
    const inactive = await makeApplication("view-inactive", scope.id);
    for (const application of [direct, descendant, unauthorized]) {
      await importDocument(
        application.id,
        "backend",
        document(["1.0.0"], marker),
      );
    }
    const deactivated = await importDocument(
      inactive.id,
      "backend",
      document(["1.0.0"], marker),
    );
    await sourceRequest(inactive.id, deactivated.committed.sourceId)
      .send({ active: false, revision: 1 })
      .expect(200);
    const list = (query: Record<string, string | number> = {}) =>
      request(app().getHttpServer())
        .get("/technologies/end-of-life")
        .set("Authorization", `Bearer ${getToken(reader)}`)
        .query({ status: "all", search: marker, pageSize: 1, ...query });
    const first = await list({ page: 0 }).expect(200);
    const second = await list({ page: 1 }).expect(200);
    expect(first.body.total).toBe(2);
    expect(second.body.total).toBe(2);
    expect(first.body.results).toHaveLength(1);
    expect(second.body.results).toHaveLength(1);
    expect([first.body.results[0].id, second.body.results[0].id]).toEqual([
      direct.id,
      descendant.id,
    ]);
    expect(first.body.results[0].technologies[0]).toMatchObject({
      product: marker,
      status: null,
      source: "SBOM",
      sourceName: "backend",
      eolDate: null,
    });
    expect(first.body.results[0].worstStatus).toBeNull();
    await list({ page: 2 }).expect(200, { total: 2, results: [] });
    for (const status of ["eol", "eol-soon", "eoas-passed"]) {
      await list({ status }).expect(200, { total: 0, results: [] });
    }
    const exported = await readTechnologies(
      await binaryDownload("/technologies/end-of-life/export", reader, {
        status: "all",
        search: marker,
        page: 2,
        pageSize: 1,
      }).expect(200),
    );
    expect(exported.rows.map((row) => row[0])).toEqual([
      direct.id,
      descendant.id,
    ]);
    expect(
      exported.rows.every(
        (row) => row[10] === "SBOM" && row[9] === "Fin de vie non évaluée",
      ),
    ).toBe(true);
    await reader.update({ additionalPermissions: [Permission.TechnologyList] });
    await binaryDownload("/technologies/end-of-life/export", reader, {
      status: "all",
      search: marker,
    }).expect(403);
  });

  it("filtre les composants exportés par TechnologyRead et impose DataExport", async () => {
    const exportPrefix = `export-${randomUUID()}`;
    const allowed = await makeApplication(`${exportPrefix}-allowed`);
    const denied = await makeApplication(`${exportPrefix}-denied`);
    await importDocument(
      allowed.id,
      "backend",
      document(["1.0.0"], "allowed-component"),
    );
    await importDocument(
      denied.id,
      "backend",
      document(["1.0.0"], "private-component"),
    );
    const user = await UserFaker.create({
      role: Roles.VISITOR,
      additionalPermissions: [Permission.DataExport, Permission.BetaFeatures],
    });
    const readable = await ActorTypeFaker.create([Permission.TechnologyRead]);
    const hidden = await ActorTypeFaker.create([]);
    await prisma.actor.createMany({
      data: [
        {
          applicationId: allowed.id,
          email: user.email,
          actorTypeId: readable.id,
        },
        { applicationId: denied.id, email: user.email, actorTypeId: hidden.id },
      ],
    });
    const query = {
      search: exportPrefix,
      currentStatus__in: "in_production",
      page: 5,
      pageSize: 1,
    };
    const { rows, workbook } = await readTechnologies(
      await binaryDownload("/applications/export/excel", user, query).expect(
        200,
      ),
    );
    expect(workbook.getWorksheet("Applications")!.actualRowCount).toBe(3);
    expect(rows).toHaveLength(1);
    expect(rows[0][0]).toBe(allowed.id);
    expect(rows[0][3]).toBe("allowed-component");
    const html = await request(app().getHttpServer())
      .get("/applications/export/html")
      .set("Authorization", `Bearer ${getToken(user)}`)
      .query(query)
      .expect(200);
    expect(html.text).toContain("allowed-component");
    expect(html.text).not.toContain("private-component");
    await user.update({ additionalPermissions: [Permission.BetaFeatures] });
    await binaryDownload("/applications/export/excel", user, query).expect(403);
  });
});
