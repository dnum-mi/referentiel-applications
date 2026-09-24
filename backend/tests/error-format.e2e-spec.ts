import { Roles } from "@prisma/client";
import request from "supertest";
import { ApplicationFaker } from "./fakers/application.faker";
import { getPrismaClient } from "./fakers/prisma";
import { OrganizationFaker } from "./fakers/organization.faker";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

// #2292 : le format d'erreur est un contrat public (docs/05-api.md). Ces tests le vérifient sur
// des erreurs réellement produites par l'API, pas sur des exceptions fabriquées.
describe("Format des erreurs de l'API (#2292)", () => {
  const app = setupTestSuite();
  let admin: Awaited<ReturnType<typeof UserFaker.create>>;
  let token: string;

  beforeAll(async () => {
    admin = await UserFaker.create({ role: Roles.ADMIN });
    token = getToken(admin);
  });

  const expectEnvelope = (
    body: Record<string, unknown>,
    statusCode: number,
  ) => {
    expect(body.statusCode).toBe(statusCode);
    expect(typeof body.correlationId).toBe("string");
    expect(String(body.correlationId).length).toBeGreaterThan(0);
    expect(Date.parse(String(body.timestamp))).not.toBeNaN();
    expect(typeof body.path).toBe("string");
  };

  it("404 : enveloppe complète et en-tête de corrélation aligné sur le corps", async () => {
    const response = await request(app().getHttpServer())
      .get("/applications/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${token}`)
      .expect(404);

    expectEnvelope(response.body, 404);
    expect(response.headers["x-correlation-id"]).toBe(
      response.body.correlationId,
    );
  });

  it("reprend l'identifiant de corrélation fourni par l'appelant", async () => {
    const correlationId = `test-${Date.now()}`;

    const response = await request(app().getHttpServer())
      .get("/applications/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Correlation-ID", correlationId)
      .expect(404);

    expect(response.body.correlationId).toBe(correlationId);
  });

  it("400 de validation : le tableau de messages reste un tableau", async () => {
    const response = await request(app().getHttpServer())
      .post("/applications")
      .set("Authorization", `Bearer ${token}`)
      .send({ label: "", description: "", status: { status: "in_production" } })
      .expect(400);

    expectEnvelope(response.body, 400);
    expect(Array.isArray(response.body.message)).toBe(true);
  });

  it("401 sur jeton illisible : l'enveloppe est présente même avant l'intercepteur de log", async () => {
    const response = await request(app().getHttpServer())
      .get("/applications")
      .set("Authorization", "Bearer pas-un-jeton")
      .expect(401);

    expectEnvelope(response.body, 401);
  });

  // Limite assumée : le refus d'authentification sans jeton est écrit directement sur la réponse
  // par `AuthMiddleware` (`res.status(401).json(...)`), qui court-circuite le pipeline Nest. Aucun
  // filtre ne peut l'enrichir. Ce test fige le comportement réel plutôt que de le laisser flotter.
  it("401 sans jeton : réponse du middleware, hors enveloppe", async () => {
    const response = await request(app().getHttpServer())
      .get("/applications")
      .expect(401);

    expect(response.body.message).toBe("L'authentification a échoué");
    expect(response.body.correlationId).toBeUndefined();
  });

  it("409 métier : une organisation avec des filles n'est plus un 500", async () => {
    const parent = await OrganizationFaker.create();
    const child = await OrganizationFaker.create();
    await getPrismaClient().organization.update({
      where: { id: child.id },
      data: { parentId: parent.id },
    });

    const response = await request(app().getHttpServer())
      .delete(`/organizations/${parent.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(409);

    expectEnvelope(response.body, 409);
    expect(String(response.body.message)).toContain("organisations filles");
  });

  it("404 préservé : modifier une application inexistante reste un 404", async () => {
    const response = await request(app().getHttpServer())
      .patch("/applications/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${token}`)
      .send({ label: "Nouveau libellé" })
      .expect(404);

    expectEnvelope(response.body, 404);
  });

  it("aucune réponse d'erreur ne laisse fuir un détail interne", async () => {
    const application = await ApplicationFaker.create(admin);

    const response = await request(app().getHttpServer())
      .patch(`/applications/${application.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ label: 42 })
      .expect(400);

    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toMatch(/prisma|PrismaClient|node_modules|\/app\//i);
  });
});
