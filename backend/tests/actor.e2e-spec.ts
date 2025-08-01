import request from "supertest";
import { setupTestSuite } from "./setup";
import { getToken } from "./getToken";
import { UserFaker } from "./fakers/user.faker";
import { ApplicationFaker } from "./fakers/application.faker";
import { getPrismaClient } from "./fakers/prisma";
import { ActorTypeFaker } from "./fakers/actor-type.faker";
import { ActorFaker } from "./fakers/actor.faker";
import { AdminLevel } from "src/user/entities/user.entity";

describe("Actor", () => {
  const app = setupTestSuite();
  let application: { id: string };
  let user: { keycloakId: string };
  let TOKEN: string;
  const prisma = getPrismaClient();
  afterAll(async () => {
    prisma.$disconnect();
  });

  it("/GET actor", async () => {
    user = await UserFaker.create(AdminLevel.READ);
    application = await ApplicationFaker.create(user);
    TOKEN = await getToken(user);
    const response = await request(app().getHttpServer())
      .get(`/applications/${application.id}/actors`)
      .set("Authorization", `Bearer ${TOKEN}`);

    expect(response.status).toBe(200);
  });

  it("/POST actor", async () => {
    user = await UserFaker.create(AdminLevel.WRITE);
    application = await ApplicationFaker.create(user);
    TOKEN = await getToken(user);
    await request(app().getHttpServer())
      .post(`/applications/${application.id}/actors`)
      .send({
        email: "test@test.co",
        firstname: "firstname",
        lastname: "lastname",
        actorTypeId: "",
        organizationId: "",
        applicationId: application.id,
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(201);
  });
});

describe("application guard", () => {
  const app = setupTestSuite();
  let appOwner: { keycloakId: string, email: string };
  let appActor: { keycloakId: string, email: string };
  let TOKEN: string;
  const prisma = getPrismaClient();

  beforeAll(async () => {
    appOwner = await UserFaker.create();
    appActor = await UserFaker.create();
    TOKEN = await getToken(appActor);
  });

  afterAll(async () => {
    prisma.$disconnect();
  });

  it("permissions testing", async () => {
    const actorType = await ActorTypeFaker.create(["readActors"]);
    const application = await ApplicationFaker.create(appOwner);
    await ActorFaker.link({
      userEmail: appActor.email,
      actorTypeId: actorType.id,
      applicationId: application.id,
    });

    // Should fail because the user does not have the write permission
    await request(app().getHttpServer())
      .post(`/applications/${application.id}/actors`)
      .send({
        email: appOwner.email,
        firstname: "firstname",
        lastname: "lastname",
        actorTypeId: actorType.id,
        applicationId: application.id,
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(403);

    // Should succeed after granting the write permission
    await actorType.update(["writeActors"]);
    const actorCreated = await request(app().getHttpServer())
      .post(`/applications/${application.id}/actors`)
      .send({
        email: appOwner.email,
        firstname: "firstname",
        lastname: "lastname",
        actorTypeId: actorType.id,
        applicationId: application.id,
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(201);
    const actorId = actorCreated.body.id;
    expect(actorId).toBeDefined();

    // remove all permission
    await actorType.update([], { reset: true });
    // Should fail to get the actor because the user does not have the read permission
    await request(app().getHttpServer())
      .get(`/applications/${application.id}/actors/${actorId}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(403);

    // Should fail to list actors because the user does not have the read permission
    await request(app().getHttpServer())
      .get(`/applications/${application.id}/actors`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(403);

    // Add read permission
    await actorType.update(["readActors"]);

    // Should succeed to get the actor
    await request(app().getHttpServer())
      .get(`/applications/${application.id}/actors/${actorId}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);
    // Should succeed to list actors
    await request(app().getHttpServer())
      .get(`/applications/${application.id}/actors`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    // should fail on write permission
    await request(app().getHttpServer())
      .patch(`/applications/${application.id}/actors/${actorId}`)
      .send({
        firstname: "newFirstname",
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(403);

    await request(app().getHttpServer())
      .delete(`/applications/${application.id}/actors/${actorId}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(403);

    // Add write permission again
    await actorType.update(["writeActors"]);

    // Should succeed to update the actor
    await request(app().getHttpServer())
      .patch(`/applications/${application.id}/actors/${actorId}`)
      .send({
        firstname: "newFirstname",
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    // Should succeed to delete the actor
    await request(app().getHttpServer())
      .delete(`/applications/${application.id}/actors/${actorId}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    // Finally delete the actor type
    await actorType.delete();
  });
});
