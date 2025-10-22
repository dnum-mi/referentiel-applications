import request from "supertest";
import { setupTestSuite } from "./setup";
import { getToken } from "./getToken";
import type { UserFakerReturnType } from "./fakers/user.faker";
import { UserFaker } from "./fakers/user.faker";
import { ApplicationFaker } from "./fakers/application.faker";
import { ActorTypeFaker } from "./fakers/actor-type.faker";
import { ActorFaker } from "./fakers/actor.faker";
import type { AsyncReturnType } from "src/utils/types.util";
import { AdminLevel } from "src/user/entities/user.entity";

describe("Labels", () => {
  const app = setupTestSuite();
  let application: { id: string };
  let user: UserFakerReturnType;

  beforeAll(async () => {
    user = await UserFaker.create({ adminLevel: AdminLevel.WRITE });
    application = await ApplicationFaker.create(user);
  });

  it("/GET applications/:applicationId/labels", async () => {
    const TOKEN = await getToken(user);
    await request(app().getHttpServer())
      .get(`/applications/${application.id}/labels`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);
  });

  it("/POST applications/:applicationId/labels", async () => {
    const TOKEN = await getToken(user);
    await request(app().getHttpServer())
      .post(`/applications/${application.id}/labels`)
      .send({
        source: "",
        value: "Test Application",
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(201);
  });
});

describe("application guard", () => {
  const app = setupTestSuite();
  let appOwner: UserFakerReturnType;
  let appActor: UserFakerReturnType;
  let TOKEN: string;
  let actorType: AsyncReturnType<typeof ActorTypeFaker.create>;

  beforeAll(async () => {
    actorType = await ActorTypeFaker.create(["readBase"]);
    appOwner = await UserFaker.create();
    appActor = await UserFaker.create();
    TOKEN = await getToken(appActor);
  });

  afterAll(async () => {
    await actorType.delete();
  });

  it("permissions testing", async () => {
    // read and write labels are parts of readBase and writeBase permissions
    const application = await ApplicationFaker.create(appOwner);
    await ActorFaker.link({
      userEmail: appActor.email,
      actorTypeId: actorType.id,
      applicationId: application.id,
    });

    // Should fail because the user does not have the write permission
    await request(app().getHttpServer())
      .post(`/applications/${application.id}/labels`)
      .send({
        source: "LES TESTS",
        value: "Test Label",
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(403);

    // Should succeed after granting the write permission
    await actorType.update(["writeBase"]);

    // Create a label
    const label = await request(app().getHttpServer())
      .post(`/applications/${application.id}/labels`)
      .send({
        source: "LES TESTS",
        value: "Test Label",
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(201);
    const labelId = label.body.id;
    expect(labelId).toBeDefined();

    // remove all permission
    await actorType.update([], { reset: true });

    // Should fail to list labels because the user does not have the read permission
    await request(app().getHttpServer())
      .get(`/applications/${application.id}/labels`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(403);

    // Add read permission
    await actorType.update(["readBase"]);

    // Should succeed to list labels
    await request(app().getHttpServer())
      .get(`/applications/${application.id}/labels`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    // should fail on write permission
    await request(app().getHttpServer())
      .patch(`/applications/${application.id}/labels/${labelId}`)
      .send({
        value: "Updated Label",
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(403);

    await request(app().getHttpServer())
      .delete(`/applications/${application.id}/labels/${labelId}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(403);

    // Add write permission again
    await actorType.update(["writeBase"]);

    // // Should succeed to update the label
    await request(app().getHttpServer())
      .patch(`/applications/${application.id}/labels/${labelId}`)
      .send({
        value: "Updated Label",
        source: "Updated TESTS",
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    // Should succeed to delete the label
    await request(app().getHttpServer())
      .delete(`/applications/${application.id}/labels/${labelId}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(204);
  });
});
