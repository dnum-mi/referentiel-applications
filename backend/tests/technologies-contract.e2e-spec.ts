import { Roles } from "@prisma/client";
import request from "supertest";
import { ApplicationFaker } from "./fakers/application.faker";
import { getPrismaClient } from "./fakers/prisma";
import type { UserFakerReturnType } from "./fakers/user.faker";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

const day = 24 * 60 * 60 * 1000;

// #2526 : contrat HTTP du module Technologies — garde anti-IDOR, saisie manuelle, statut calculé,
// catalogue, vue transverse (filtre et pagination), validation des DTO (#2527).
describe("Technologies — contrat HTTP (#2526, #2527)", () => {
  const app = setupTestSuite();
  const prisma = getPrismaClient();

  let admin: UserFakerReturnType;
  let TOKEN: string;
  let applicationA: Awaited<ReturnType<typeof ApplicationFaker.create>>;
  let applicationB: Awaited<ReturnType<typeof ApplicationFaker.create>>;

  const post = (applicationId: string, body: Record<string, unknown>) =>
    request(app().getHttpServer())
      .post(`/applications/${applicationId}/technologies`)
      .send(body)
      .set("Authorization", `Bearer ${TOKEN}`);

  beforeAll(async () => {
    admin = await UserFaker.create({ role: Roles.ADMIN });
    TOKEN = getToken(admin);
    applicationA = await ApplicationFaker.create(admin);
    applicationB = await ApplicationFaker.create(admin);
  });

  afterAll(async () => {
    await ApplicationFaker.delete(applicationA.id);
    await ApplicationFaker.delete(applicationB.id);
  });

  describe("garde anti-IDOR : une technologie n'est joignable que par sa propre application", () => {
    let technologyId: string;

    beforeAll(async () => {
      const res = await post(applicationA.id, {
        technology: "Base de données",
        product: "PostgreSQL",
        version: "15",
      }).expect(201);
      technologyId = res.body.id;
    });

    it("PATCH par une autre application → 404, sans modification", async () => {
      await request(app().getHttpServer())
        .patch(`/applications/${applicationB.id}/technologies/${technologyId}`)
        .send({ version: "16" })
        .set("Authorization", `Bearer ${TOKEN}`)
        .expect(404);
      const row = await prisma.technologyStack.findUnique({
        where: { id: technologyId },
      });
      expect(row?.version).toBe("15");
    });

    it("DELETE par une autre application → 404, la ligne subsiste", async () => {
      await request(app().getHttpServer())
        .delete(`/applications/${applicationB.id}/technologies/${technologyId}`)
        .set("Authorization", `Bearer ${TOKEN}`)
        .expect(404);
      expect(
        await prisma.technologyStack.findUnique({
          where: { id: technologyId },
        }),
      ).not.toBeNull();
    });
  });

  describe("saisie manuelle et statut calculé", () => {
    it("POST avec manualEolDate : origine manuelle, date persistée, statut calculé", async () => {
      const soon = new Date(Date.now() + 30 * day).toISOString().slice(0, 10);
      const res = await post(applicationA.id, {
        technology: "Logiciel interne",
        product: "Outil maison",
        version: "2",
        manualEolDate: soon,
      }).expect(201);
      expect(res.body.eolSource).toBe("manual");
      expect(res.body.eolDate).toMatch(new RegExp(`^${soon}`));
      expect(res.body.eolProduct).toBeNull();
      expect(res.body.eolStatus).toBe("eol-soon");

      // PATCH null : retour à l'automatique (en test, endoflife.date est coupé → « jamais vérifiée »).
      const patched = await request(app().getHttpServer())
        .patch(`/applications/${applicationA.id}/technologies/${res.body.id}`)
        .send({ manualEolDate: null })
        .set("Authorization", `Bearer ${TOKEN}`)
        .expect(200);
      expect(patched.body.eolSource).toBe("endoflife");
      expect(patched.body.eolDate).toBeNull();
      expect(patched.body.eolStatus).toBeNull();
    });

    it("GET expose eolStatus sur chaque ligne", async () => {
      const res = await request(app().getHttpServer())
        .get(`/applications/${applicationA.id}/technologies`)
        .set("Authorization", `Bearer ${TOKEN}`)
        .expect(200);
      expect(res.body.length).toBeGreaterThan(0);
      for (const row of res.body) expect(row).toHaveProperty("eolStatus");
    });

    it("GET eol-products répond 200 avec un tableau (vide quand endoflife.date est coupé) et un en-tête de cache", async () => {
      const res = await request(app().getHttpServer())
        .get(`/applications/${applicationA.id}/technologies/eol-products`)
        .set("Authorization", `Bearer ${TOKEN}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.headers["cache-control"]).toContain("max-age=3600");
    });
  });

  describe("validation des DTO (#2527)", () => {
    it.each([
      ["produit vide", { technology: "Langage", product: "  " }],
      [
        "technologie trop longue",
        { technology: "x".repeat(101), product: "PostgreSQL" },
      ],
      [
        "docUrl sans schéma",
        { technology: "Langage", product: "Python", docUrl: "www.python.org" },
      ],
      [
        "docUrl avec un schéma non web",
        {
          technology: "Langage",
          product: "Python",
          docUrl: "ftp://python.org",
        },
      ],
    ])("refuse en 400 : %s", async (_label, body) => {
      await post(applicationA.id, body).expect(400);
    });
  });

  describe("vue transverse : filtre de statut et pagination", () => {
    beforeAll(async () => {
      await prisma.technologyStack.create({
        data: {
          applicationId: applicationB.id,
          technology: "Base de données",
          product: "MySQL",
          version: "5.7",
          eolProduct: "mysql",
          eolCycle: "5.7",
          eolDate: new Date(Date.now() - 100 * day),
          eolCheckedAt: new Date(),
        },
      });
    });

    it("status=eol liste l'application, status=eol-soon ne la liste pas", async () => {
      const eol = await request(app().getHttpServer())
        .get("/technologies/end-of-life")
        .query({ status: "eol", search: applicationB.label })
        .set("Authorization", `Bearer ${TOKEN}`)
        .expect(200);
      expect(eol.body.results.map((r: { id: string }) => r.id)).toContain(
        applicationB.id,
      );
      const listed = eol.body.results.find(
        (r: { id: string }) => r.id === applicationB.id,
      );
      expect(listed.worstStatus).toBe("eol");
      expect(listed.technologies[0].status).toBe("eol");

      const soon = await request(app().getHttpServer())
        .get("/technologies/end-of-life")
        .query({ status: "eol-soon", search: applicationB.label })
        .set("Authorization", `Bearer ${TOKEN}`)
        .expect(200);
      expect(soon.body.results.map((r: { id: string }) => r.id)).not.toContain(
        applicationB.id,
      );
    });

    it("pagine : pageSize=1 renvoie une seule ligne et un total global", async () => {
      const res = await request(app().getHttpServer())
        .get("/technologies/end-of-life")
        .query({ page: 0, pageSize: 1 })
        .set("Authorization", `Bearer ${TOKEN}`)
        .expect(200);
      expect(res.body.results.length).toBeLessThanOrEqual(1);
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });

    it("refuse un statut inconnu", async () => {
      await request(app().getHttpServer())
        .get("/technologies/end-of-life")
        .query({ status: "unknown" })
        .set("Authorization", `Bearer ${TOKEN}`)
        .expect(400);
    });
  });
});
