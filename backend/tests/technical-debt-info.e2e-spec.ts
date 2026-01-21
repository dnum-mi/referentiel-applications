import type { AsyncReturnType } from "src/utils/types.util";
import type { UserFakerReturnType } from "./fakers/user.faker";
import { AdminLevel } from "src/user/entities/user.entity";
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
    user = await UserFaker.create({ adminLevel: AdminLevel.WRITE });
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
        technicalMaturity: 3,
        businessMaturity: 4,
        costMaturity: 2,
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(201);

    expect(response.body.id).toBeDefined();
    expect(response.body.technicalMaturity).toEqual(3);
    expect(response.body.businessMaturity).toEqual(4);
    expect(response.body.costMaturity).toEqual(2);
  });

  it("/GET applications/:applicationId/technical-debt-info - should return the technical debt info", async () => {
    const response = await request(app().getHttpServer())
      .get(`/applications/${application.id}/technical-debt-info`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    expect(response.body.id).toBeDefined();
    expect(response.body.technicalMaturity).toEqual(3);
    expect(response.body.businessMaturity).toEqual(4);
    expect(response.body.costMaturity).toEqual(2);
  });

  it("/PATCH applications/:applicationId/technical-debt-info - update technical debt info", async () => {
    const response = await request(app().getHttpServer())
      .patch(`/applications/${application.id}/technical-debt-info`)
      .send({
        technicalMaturity: 5,
        costMaturity: null,
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    expect(response.body.id).toBeDefined();
    expect(response.body.technicalMaturity).toEqual(5);
    expect(response.body.businessMaturity).toEqual(4);
    expect(response.body.costMaturity).toBeNull();
  });

  it("/POST applications/:applicationId/technical-debt-info - should return 409 when already exists", async () => {
    await request(app().getHttpServer())
      .post(`/applications/${application.id}/technical-debt-info`)
      .send({
        technicalMaturity: 1,
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(409);
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
    const actorType = await ActorTypeFaker.create(["readBase"]);
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
    await actorType.update(["writeBase"]);
    const technicalDebtInfo = await request(app().getHttpServer())
      .post(`/applications/${application.id}/technical-debt-info`)
      .send({
        technicalMaturity: 3,
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(201);
    expect(technicalDebtInfo.body.technicalMaturity).toEqual(3);

    // remove all permission
    await actorType.update([], { reset: true });
    // Should fail to get the technical debt info because the user does not have the read permission
    await request(app().getHttpServer())
      .get(`/applications/${application.id}/technical-debt-info`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(403);
  });
});

describe("TechnicalDebts", () => {
  const app = setupTestSuite();
  let user: UserFakerReturnType;
  let TOKEN: string;
  let applicationA: AsyncReturnType<typeof ApplicationFaker.create>;
  let applicationB: AsyncReturnType<typeof ApplicationFaker.create>;

  beforeAll(async () => {
    user = await UserFaker.create({ adminLevel: AdminLevel.WRITE });
    TOKEN = await getToken(user);
    applicationA = await ApplicationFaker.create(user);
    applicationB = await ApplicationFaker.create(user);

    await request(app().getHttpServer())
      .post(`/applications/${applicationA.id}/technical-debt-info`)
      .send({
        technicalMaturity: 2,
        businessMaturity: 3,
        costMaturity: 4,
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(201);

    await request(app().getHttpServer())
      .post(`/applications/${applicationB.id}/technical-debt-info`)
      .send({
        technicalMaturity: 1,
        businessMaturity: 2,
        costMaturity: 3,
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(201);
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
});
