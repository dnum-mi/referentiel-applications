import request from "supertest";
import { setupTestSuite } from "./setup";
import { getToken } from "./getToken";
import { UserFaker } from "./fakers/user.faker";
import { ApplicationFaker } from "./fakers/application.faker";
import { LinkFaker } from "./fakers/link.faker";
import { getPrismaClient } from "./fakers/prisma";
import type { AsyncReturnType } from "src/utils/types.util";
import { ActorTypeFaker } from "./fakers/actor-type.faker";
import { ActorFaker } from "./fakers/actor.faker";
import { AdminLevel } from "src/user/entities/user.entity";

describe("Links", () => {
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

  it("/GET applications/:applicationId/links", async () => {
    await request(app().getHttpServer())
      .get(`/applications/${application.id}/links`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);
  });

  it("/POST applications/:applicationId/links", async () => {
    await request(app().getHttpServer())
      .post(`/applications/${application.id}/links`)
      .send({
        type: "documentation",
        link: "https://example.com",
        description: "Example link",
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(201);
  });

  it("/PATCH applications/:applicationId/links/:id", async () => {
    const link = await LinkFaker.create(application, user);

    await request(app().getHttpServer())
      .patch(`/applications/${application.id}/links/${link.id}`)
      .send({
        description: "Updated description",
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);
  });

  it("/DELETE applications/:applicationId/links/:id", async () => {
    const link = await LinkFaker.create(application, user);

    await request(app().getHttpServer())
      .delete(`/applications/${application.id}/links/${link.id}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);
  });
});

describe("application guard", () => {
  const app = setupTestSuite();
  let appOwner: { keycloakId: string, email: string };
  let appActor: { keycloakId: string, email: string };
  let TOKEN: string;
  const prisma = getPrismaClient();
  let actorType: AsyncReturnType<typeof ActorTypeFaker.create>;

  beforeAll(async () => {
    appOwner = await UserFaker.create();
    appActor = await UserFaker.create();
    TOKEN = await getToken(appActor);
    actorType = await ActorTypeFaker.create(["readLinks"]);
  });

  afterAll(async () => {
    await actorType.delete();
    prisma.$disconnect();
  });

  it("permissions testing", async () => {
    const application = await ApplicationFaker.create(appOwner);
    await ActorFaker.link({
      userEmail: appActor.email,
      actorTypeId: actorType.id,
      applicationId: application.id,
    });

    // Should fail because the user does not have the write permission
    await request(app().getHttpServer())
      .post(`/applications/${application.id}/links`)
      .send({
        type: "documentation",
        link: "https://example.com",
        description: "Example link",
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(403);

    // Should succeed after granting the write permission
    await actorType.update(["writeLinks"]);
    const link = await request(app().getHttpServer())
      .post(`/applications/${application.id}/links`)
      .send({
        type: "documentation",
        link: "https://example.com",
        description: "Example link",
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(201);
    const linkId = link.body.id;
    expect(linkId).toBeDefined();

    // remove all permission
    await actorType.update([], { reset: true });

    // Should fail to list links because the user does not have the read permission
    await request(app().getHttpServer())
      .get(`/applications/${application.id}/links`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(403);

    // Add read permission
    await actorType.update(["readLinks"]);

    // Should succeed to list links
    await request(app().getHttpServer())
      .get(`/applications/${application.id}/links`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    // should fail on write permission
    await request(app().getHttpServer())
      .patch(`/applications/${application.id}/links/${linkId}`)
      .send({
        description: "Updated description",
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(403);

    await request(app().getHttpServer())
      .delete(`/applications/${application.id}/links/${linkId}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(403);

    // Add write permission again
    await actorType.update(["writeLinks"]);

    // Should succeed to update the link
    await request(app().getHttpServer())
      .patch(`/applications/${application.id}/links/${linkId}`)
      .send({
        description: "Updated Hosting",
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    // Should succeed to delete the link
    await request(app().getHttpServer())
      .delete(`/applications/${application.id}/links/${linkId}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);
  });
});
