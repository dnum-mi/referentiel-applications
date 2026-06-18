import type { AsyncReturnType } from "src/utils/types.util";
import type { UserFakerReturnType } from "./fakers/user.faker";
import { Roles } from "@prisma/client";
import request from "supertest";
import { ActorTypeFaker } from "./fakers/actor-type.faker";
import { ActorFaker } from "./fakers/actor.faker";
import { ApplicationFaker } from "./fakers/application.faker";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

describe("TechnicalDebtInfo", () => {
  const app = setupTestSuite();
  let application: { id: string };
  let user: UserFakerReturnType;
  let TOKEN: string;

  beforeAll(async () => {
    user = await UserFaker.create({ role: Roles.CONTRIBUTOR });
    TOKEN = await getToken(user);
    application = await ApplicationFaker.create(user);
  });

  it("/GET applications/:applicationId/technical-debt-info - should return 404 when not exists", async () => {
    await request(app().getHttpServer())
      .get(`/applications/${application.id}/technical-debt-info`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(404);
  });

  it("/POST applications/:applicationId/technical-debt-info - create technical debt info", async () => {
    const response = await request(app().getHttpServer())
      .post(`/applications/${application.id}/technical-debt-info`)
      .send({
        technicalMaturity: 3.25,
        businessMaturity: 4.1,
        costMaturity: 2.75,
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(201);

    expect(response.body.id).toBeDefined();
    expect(response.body.technicalMaturity).toEqual(3.25);
    expect(response.body.businessMaturity).toEqual(4.1);
    expect(response.body.costMaturity).toEqual(2.75);
    // Le millésime est renseigné par défaut avec l'année courante.
    expect(response.body.millesime).toEqual(new Date().getFullYear());
  });

  it("/POST applications/:applicationId/technical-debt-info - should accept an explicit millesime", async () => {
    const newApplication = await ApplicationFaker.create(user);

    const response = await request(app().getHttpServer())
      .post(`/applications/${newApplication.id}/technical-debt-info`)
      .send({
        technicalMaturity: 2,
        millesime: 2024,
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(201);

    expect(response.body.millesime).toEqual(2024);
  });

  it("/POST applications/:applicationId/technical-debt-info - should reject an out-of-range millesime", async () => {
    const newApplication = await ApplicationFaker.create(user);

    await request(app().getHttpServer())
      .post(`/applications/${newApplication.id}/technical-debt-info`)
      .send({
        millesime: 1999,
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(400);
  });

  it("/GET applications/:applicationId/technical-debt-info - should return the technical debt info", async () => {
    const response = await request(app().getHttpServer())
      .get(`/applications/${application.id}/technical-debt-info`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    expect(response.body.results).toBeDefined();
    expect(response.body.results.length).toBeGreaterThanOrEqual(1);
    const latest = response.body.results[0];
    expect(latest.id).toBeDefined();
    expect(latest.technicalMaturity).toEqual(3.25);
    expect(latest.businessMaturity).toEqual(4.1);
    expect(latest.costMaturity).toEqual(2.75);
  });

  it("/POST applications/:applicationId/technical-debt-info - should add a new historic entry", async () => {
    const response = await request(app().getHttpServer())
      .post(`/applications/${application.id}/technical-debt-info`)
      .send({
        technicalMaturity: 4.5,
        costMaturity: 0,
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(201);

    expect(response.body.id).toBeDefined();
    expect(response.body.technicalMaturity).toEqual(4.5);
    expect(response.body.costMaturity).toEqual(0);

    const listResponse = await request(app().getHttpServer())
      .get(`/applications/${application.id}/technical-debt-info`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    expect(listResponse.body.results.length).toBeGreaterThanOrEqual(2);
  });

  it("/POST applications/:applicationId/technical-debt-info - should validate maturity scores range", async () => {
    const newApplication = await ApplicationFaker.create(user);

    // Test value > 5
    await request(app().getHttpServer())
      .post(`/applications/${newApplication.id}/technical-debt-info`)
      .send({
        technicalMaturity: 6,
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(400);

    // Test value < 0
    await request(app().getHttpServer())
      .post(`/applications/${newApplication.id}/technical-debt-info`)
      .send({
        businessMaturity: -1,
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(400);
  });
});

describe("TechnicalDebtInfo - application guard", () => {
  const app = setupTestSuite();
  let appOwner: UserFakerReturnType;
  let appActor: UserFakerReturnType;
  let TOKEN: string;
  let application: AsyncReturnType<typeof ApplicationFaker.create>;

  beforeAll(async () => {
    appOwner = await UserFaker.create();
    appActor = await UserFaker.create();
    application = await ApplicationFaker.create(appOwner);
    TOKEN = await getToken(appActor);
  });

  afterAll(async () => {
    await ApplicationFaker.delete(application.id);
  });

  it("permissions testing", async () => {
    const actorType = await ActorTypeFaker.create(["AppRead"]);
    await ActorFaker.link({
      userEmail: appActor.email,
      actorTypeId: actorType.id,
      applicationId: application.id,
    });

    // Should fail because the user does not have the write permission
    await request(app().getHttpServer())
      .post(`/applications/${application.id}/technical-debt-info`)
      .send({
        technicalMaturity: 3,
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(403);

    // Should succeed after granting the write permission
    await actorType.update(["AppWrite"]);
    const technicalDebtInfo = await request(app().getHttpServer())
      .post(`/applications/${application.id}/technical-debt-info`)
      .send({
        technicalMaturity: 3.4,
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(201);
    expect(technicalDebtInfo.body.technicalMaturity).toEqual(3.4);

    // remove all permission
    await actorType.update([], { reset: true });
    // Should succeed to get the technical debt info because AppRead is granted to all authenticated users
    await request(app().getHttpServer())
      .get(`/applications/${application.id}/technical-debt-info`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);
  });
});

describe("TechnicalDebts", () => {
  const app = setupTestSuite();
  let user: UserFakerReturnType;
  let TOKEN: string;
  let applicationA: AsyncReturnType<typeof ApplicationFaker.create>;
  let applicationB: AsyncReturnType<typeof ApplicationFaker.create>;
  const currentYear = new Date().getFullYear();
  // Applications créées par les tests : supprimées en fin de suite (le cascade
  // retire leurs entrées de dette, pour ne pas polluer le millésime « courant »).
  const createdAppIds: string[] = [];

  beforeAll(async () => {
    user = await UserFaker.create({ role: Roles.CONTRIBUTOR });
    TOKEN = await getToken(user);
    applicationA = await ApplicationFaker.create(user);
    applicationB = await ApplicationFaker.create(user);
    createdAppIds.push(applicationA.id, applicationB.id);

    await request(app().getHttpServer())
      .post(`/applications/${applicationA.id}/technical-debt-info`)
      .send({
        technicalMaturity: 2.2,
        businessMaturity: 3.15,
        costMaturity: 4.05,
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(201);

    await request(app().getHttpServer())
      .post(`/applications/${applicationB.id}/technical-debt-info`)
      .send({
        technicalMaturity: 1.1,
        businessMaturity: 2.25,
        costMaturity: 3.5,
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(201);
  });

  afterAll(async () => {
    for (const id of createdAppIds) {
      await ApplicationFaker.delete(id);
    }
  });

  it("/GET technical-debts - should return points and honor filters", async () => {
    const response = await request(app().getHttpServer())
      .get("/technical-debts")
      .query({ label: applicationA.label })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(1);

    const resultIds = response.body.map((item: { id: string }) => item.id);
    expect(resultIds).toContain(applicationA.id);
    expect(resultIds).not.toContain(applicationB.id);
  });

  it("/GET technical-debts - should filter by millesime and default to the latest", async () => {
    const application = await ApplicationFaker.create(user);
    createdAppIds.push(application.id);
    const previousYear = currentYear - 1;

    // Deux campagnes pour la même application : l'an dernier et l'année courante.
    await request(app().getHttpServer())
      .post(`/applications/${application.id}/technical-debt-info`)
      .send({ technicalMaturity: 1, millesime: previousYear })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(201);
    await request(app().getHttpServer())
      .post(`/applications/${application.id}/technical-debt-info`)
      .send({ technicalMaturity: 4, millesime: currentYear })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(201);

    // Millésime explicite : on récupère la campagne demandée.
    const filtered = await request(app().getHttpServer())
      .get("/technical-debts")
      .query({ label: application.label, millesime: previousYear })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    const pointPrevious = filtered.body.find(
      (item: { id: string }) => item.id === application.id,
    );
    expect(pointPrevious).toBeDefined();
    expect(pointPrevious.technicalDebtInfo.millesime).toEqual(previousYear);
    expect(pointPrevious.technicalDebtInfo.technicalMaturity).toEqual(1);

    // Sans millésime : on présente la campagne la plus récente (année courante).
    const latest = await request(app().getHttpServer())
      .get("/technical-debts")
      .query({ label: application.label })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    const pointLatest = latest.body.find(
      (item: { id: string }) => item.id === application.id,
    );
    expect(pointLatest).toBeDefined();
    expect(pointLatest.technicalDebtInfo.millesime).toEqual(currentYear);
    expect(pointLatest.technicalDebtInfo.technicalMaturity).toEqual(4);
  });

  it("/GET technical-debts/millesimes - should list available campaigns sorted desc", async () => {
    const application = await ApplicationFaker.create(user);
    createdAppIds.push(application.id);
    // Deux millésimes passés distincts (n'altèrent pas le « plus récent » global).
    const older = currentYear - 5;
    const newer = currentYear - 4;
    for (const millesime of [older, newer]) {
      await request(app().getHttpServer())
        .post(`/applications/${application.id}/technical-debt-info`)
        .send({ technicalMaturity: 3, millesime })
        .set("Authorization", `Bearer ${TOKEN}`)
        .expect(201);
    }

    const response = await request(app().getHttpServer())
      .get("/technical-debts/millesimes")
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    const millesimes: number[] = response.body;
    expect(Array.isArray(millesimes)).toBe(true);
    expect(millesimes).toContain(older);
    expect(millesimes).toContain(newer);
    // Pas de doublon et tri décroissant.
    expect(new Set(millesimes).size).toEqual(millesimes.length);
    expect(millesimes).toEqual([...millesimes].sort((a, b) => b - a));
    expect(millesimes.indexOf(newer)).toBeLessThan(millesimes.indexOf(older));
  });
});
