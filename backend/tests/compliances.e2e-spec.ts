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

describe("Compliances", () => {
  const app = setupTestSuite();
  let application: { id: string };
  let user: UserFakerReturnType;
  let TOKEN: string;

  beforeAll(async () => {
    user = await UserFaker.create({ role: Roles.CONTRIBUTOR });
    TOKEN = await getToken(user);
    application = await ApplicationFaker.create(user);
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
      .expect(200);

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

  it("/PATCH applications/:applicationId/compliances - update compliance with DSFR data", async () => {
    const response = await request(app().getHttpServer())
      .patch(`/applications/${application.id}/compliances`)
      .send({
        dsfr_implemented: true,
        dsfr_version: "1.14.0",
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    expect(response.body.id).toBeDefined();
    expect(response.body.dsfr_implemented).toEqual(true);
    expect(response.body.dsfr_version).toEqual("1.14.0");
    expect(response.body.rgpd_has_aipd).toEqual(true);
    expect(response.body.rgpd_dpo_name).toEqual("Jean Dupont");
  });

  it("/POST applications/:applicationId/compliances - should upsert when compliance already exists", async () => {
    const response = await request(app().getHttpServer())
      .post(`/applications/${application.id}/compliances`)
      .send({
        dima_duration_hours: 24,
        dima_is_hno: false,
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    expect(response.body.id).toBeDefined();
    expect(response.body.dima_duration_hours).toEqual(24);
    expect(response.body.dima_is_hno).toEqual(false);
    expect(response.body.rgpd_has_aipd).toEqual(true);
    expect(response.body.rgpd_dpo_name).toEqual("Jean Dupont");
  });

  // Ticket #1901 : la durée DIMA/PDMA est restreinte à une liste de valeurs autorisées.
  it("/POST applications/:applicationId/compliances - should reject an out-of-range DIMA duration", async () => {
    await request(app().getHttpServer())
      .post(`/applications/${application.id}/compliances`)
      .send({ dima_duration_hours: 5 })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(400);
  });

  it("/POST applications/:applicationId/compliances - should reject an out-of-range PDMA duration", async () => {
    await request(app().getHttpServer())
      .post(`/applications/${application.id}/compliances`)
      .send({ pdma_duration_hours: 4 })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(400);
  });

  it("/POST applications/:applicationId/compliances - should accept the allowed DIMA/PDMA durations", async () => {
    const response = await request(app().getHttpServer())
      .post(`/applications/${application.id}/compliances`)
      .send({ dima_duration_hours: 96, pdma_duration_hours: 48 })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    expect(response.body.dima_duration_hours).toEqual(96);
    expect(response.body.pdma_duration_hours).toEqual(48);
  });
});

describe("application guard", () => {
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
    const actorType = await ActorTypeFaker.create(["ComplianceRead"]);
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
    await actorType.update(["ComplianceWrite"]);
    const compliance = await request(app().getHttpServer())
      .post(`/applications/${application.id}/compliances`)
      .send({
        dima_recovery_manager: "John Doe",
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);
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
    await actorType.update(["ComplianceRead"]);

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
    await actorType.update(["ComplianceWrite"]);

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
