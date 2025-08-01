import request from "supertest";
import { setupTestSuite } from "./setup";
import { getToken } from "./getToken";
import { UserFaker } from "./fakers/user.faker";
import { ApplicationFaker } from "./fakers/application.faker";
import { getPrismaClient } from "./fakers/prisma";
import { ActorTypeFaker } from "./fakers/actor-type.faker";
import { ActorFaker } from "./fakers/actor.faker";
import type { AsyncReturnType } from "src/utils/types.util";
import { AdminLevel } from "src/user/entities/user.entity";

describe("Compliances", () => {
  const app = setupTestSuite();
  const prisma = getPrismaClient();
  let application: { id: string };
  let user: { keycloakId: string };
  let TOKEN: string;

  beforeAll(async () => {
    user = await UserFaker.create(AdminLevel.WRITE);
    TOKEN = await getToken(user);
    application = await ApplicationFaker.create(user);
  });
  afterAll(async () => {
    prisma.$disconnect();
  });

  it("/GET applications/:applicationId/compliances", async () => {
    const response = await request(app().getHttpServer())
      .get(`/applications/${application.id}/compliances`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    expect(response.body).toEqual({});
  });

  it("/POST applications/:applicationId/compliances - create compliance with RGPD data", async () => {
    const response = await request(app().getHttpServer())
      .post(`/applications/${application.id}/compliances`)
      .send({
        rgpd_has_aipd: true,
        rgpd_dpo_name: "Jean Dupont",
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(201);

    expect(response.body.id).toBeDefined();
    expect(response.body.rgpd_has_aipd).toEqual(true);
    expect(response.body.rgpd_dpo_name).toEqual("Jean Dupont");
  });

  it("/GET applications/:applicationId/compliances - should return the compliance", async () => {
    const response = await request(app().getHttpServer())
      .get(`/applications/${application.id}/compliances`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    expect(response.body.id).toBeDefined();
    expect(response.body.rgpd_has_aipd).toEqual(true);
    expect(response.body.rgpd_dpo_name).toEqual("Jean Dupont");
  });

  it("/PATCH applications/:applicationId/compliances - update compliance with RGAA data", async () => {
    const response = await request(app().getHttpServer())
      .patch(`/applications/${application.id}/compliances`)
      .send({
        rgaa_audit_date: "2023-01-01T00:00:00.000Z",
        rgaa_score_percentage: 85,
        rgaa_service_url: "https://example.com",
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    expect(response.body.id).toBeDefined();
    expect(response.body.rgaa_score_percentage).toEqual(85);
    expect(response.body.rgaa_service_url).toEqual("https://example.com");
    expect(response.body.rgpd_has_aipd).toEqual(true);
    expect(response.body.rgpd_dpo_name).toEqual("Jean Dupont");
  });
});

describe("application guard", () => {
  const app = setupTestSuite();
  let appOwner: { keycloakId: string, email: string };
  let appActor;
  let TOKEN: string;
  const prisma = getPrismaClient();
  let application: AsyncReturnType<typeof ApplicationFaker.create>;

  beforeAll(async () => {
    appOwner = await UserFaker.create();
    appActor = await UserFaker.create();
    application = await ApplicationFaker.create(appOwner);
    TOKEN = await getToken(appActor);
  });

  afterAll(async () => {
    await ApplicationFaker.delete(application.id);
    prisma.$disconnect();
  });

  it("permissions testing", async () => {
    const actorType = await ActorTypeFaker.create(["readCompliances"]);
    await ActorFaker.link({
      userEmail: appActor.email,
      actorTypeId: actorType.id,
      applicationId: application.id,
    });

    // Refactor to replace patch and delete without id
    // Should fail because the user does not have the write permission
    await request(app().getHttpServer())
      .post(`/applications/${application.id}/compliances`)
      .send({
        dima_recovery_manager: "John Doe",
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(403);

    // Should succeed after granting the write permission
    await actorType.update(["writeCompliances"]);
    const compliance = await request(app().getHttpServer())
      .post(`/applications/${application.id}/compliances`)
      .send({
        dima_recovery_manager: "John Doe",
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(201);
    expect(compliance.body.dima_recovery_manager).toEqual("John Doe");

    // remove all permission
    await actorType.update([], { reset: true });
    // Should fail to get the compliance because the user does not have the read permission
    await request(app().getHttpServer())
      .get(`/applications/${application.id}/compliances`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(403);

    // Should fail to list compliances because the user does not have the read permission
    await request(app().getHttpServer())
      .get(`/applications/${application.id}/compliances`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(403);

    // Add read permission
    await actorType.update(["readCompliances"]);

    // Should succeed to get the compliance
    await request(app().getHttpServer())
      .get(`/applications/${application.id}/compliances`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);
    // Should succeed to list compliances
    await request(app().getHttpServer())
      .get(`/applications/${application.id}/compliances`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    // should fail on write permission
    await request(app().getHttpServer())
      .patch(`/applications/${application.id}/compliances`)
      .send({
        dima_recovery_manager: "newName",
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(403);

    // Add write permission again
    await actorType.update(["writeCompliances"]);

    // Should succeed to update the compliance
    const newCompliance = await request(app().getHttpServer())
      .patch(`/applications/${application.id}/compliances`)
      .send({
        dima_recovery_manager: "newName",
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);
    expect(newCompliance.body.dima_recovery_manager).toEqual("newName");

    // Finally delete the actor type
    await actorType.delete();
  });
});
