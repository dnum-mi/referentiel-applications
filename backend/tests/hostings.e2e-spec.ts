import request from "supertest";
import { setupTestSuite } from "./setup";
import { getToken } from "./getToken";
import type { UserFakerReturnType } from "./fakers/user.faker";
import { UserFaker } from "./fakers/user.faker";
import { HostingFaker } from "./fakers/hosting.faker";
import { HostingOptionFaker } from "./fakers/hosting-option.faker";
import { ApplicationFaker } from "./fakers/application.faker";
import { ActorTypeFaker } from "./fakers/actor-type.faker";
import { ActorFaker } from "./fakers/actor.faker";
import { AdminLevel } from "src/user/entities/user.entity";

describe("Hostings", () => {
  const app = setupTestSuite();
  let user: UserFakerReturnType;
  let application: { id: string };

  beforeAll(async () => {
    user = await UserFaker.create({ adminLevel: AdminLevel.WRITE });
    application = await ApplicationFaker.create(user);
  });

  it("/GET applications/:applicationId/hostings", async () => {
    const TOKEN = await getToken(user);
    const hostingOption = await HostingOptionFaker.create();
    await HostingFaker.create({
      application,
      hostingOption,
      user,
    });

    await request(app().getHttpServer())
      .get(`/applications/${application.id}/hostings`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);
  });

  it("/POST applications/:applicationId/hostings with hostingOption reference", async () => {
    const TOKEN = await getToken(user);
    const hostingOption = await HostingOptionFaker.create();

    const newHosting = {
      hostingOptionId: hostingOption.id,
      label: "Test Hosting with Option",
      applicationId: application.id,
    };

    await request(app().getHttpServer())
      .post(`/applications/${application.id}/hostings`)
      .send(newHosting)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(201);
  });

  it("/GET applications/:applicationId/hostings/:id", async () => {
    const TOKEN = await getToken(user);
    const hostingOption = await HostingOptionFaker.create();
    const hosting = await HostingFaker.create({
      application,
      hostingOption,
      user,
    });

    await request(app().getHttpServer())
      .get(`/applications/${application.id}/hostings/${hosting.id}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);
  });

  it("/PATCH applications/:applicationId/hostings/:id to update hostingOption", async () => {
    const TOKEN = await getToken(user);
    const hostingOption = await HostingOptionFaker.create();
    const hosting = await HostingFaker.create({
      application,
      hostingOption,
      user,
    });

    const updateData = {
      applicationId: application.id,
      hostingOptionId: hostingOption.id,
      label: "Hosting with Updated Option",
    };

    await request(app().getHttpServer())
      .patch(`/applications/${application.id}/hostings/${hosting.id}`)
      .send(updateData)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);
  });

  it("/DELETE applications/:applicationId/hostings/:id", async () => {
    const TOKEN = await getToken(user);
    const hostingOption = await HostingOptionFaker.create();
    const hosting = await HostingFaker.create({
      application,
      hostingOption,
      user,
    });

    await request(app().getHttpServer())
      .delete(`/applications/${application.id}/hostings/${hosting.id}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(204);
  });
});

describe("application guard", () => {
  const app = setupTestSuite();
  let appOwner: UserFakerReturnType;
  let appActor: UserFakerReturnType;
  let TOKEN: string;

  beforeAll(async () => {
    appOwner = await UserFaker.create();
    appActor = await UserFaker.create();
    TOKEN = await getToken(appActor);
  });

  it("permissions testing", async () => {
    const actorType = await ActorTypeFaker.create(["readHostings"]);
    const application = await ApplicationFaker.create(appOwner);
    await ActorFaker.link({
      userEmail: appActor.email,
      actorTypeId: actorType.id,
      applicationId: application.id,
    });

    // Get hostings options
    const hostingOptions = await request(app().getHttpServer())
      .get("/hosting-options")
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    const hostingOptionId = hostingOptions.body[0].id;

    // Should fail because the user does not have the write permission
    await request(app().getHttpServer())
      .post(`/applications/${application.id}/hostings`)
      .send({
        label: "Test Hosting",
        hostingOptionId,
        applicationId: application.id,
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(403);

    // Should succeed after granting the write permission
    await actorType.update(["writeHostings"]);
    const hosting = await request(app().getHttpServer())
      .post(`/applications/${application.id}/hostings`)
      .send({
        label: "Test Hosting",
        hostingOptionId,
        applicationId: application.id,
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(201);
    const hostingId = hosting.body.id;
    expect(hostingId).toBeDefined();

    // remove all permission
    await actorType.update([], { reset: true });
    // Should fail to get the hosting because the user does not have the read permission
    await request(app().getHttpServer())
      .get(`/applications/${application.id}/hostings/${hostingId}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(403);

    // Should fail to list hostings because the user does not have the read permission
    await request(app().getHttpServer())
      .get(`/applications/${application.id}/hostings`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(403);

    // Add read permission
    await actorType.update(["readHostings"]);

    // Should succeed to get the hosting
    await request(app().getHttpServer())
      .get(`/applications/${application.id}/hostings/${hostingId}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);
    // Should succeed to list hostings
    await request(app().getHttpServer())
      .get(`/applications/${application.id}/hostings`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    // should fail on write permission
    await request(app().getHttpServer())
      .patch(`/applications/${application.id}/hostings/${hostingId}`)
      .send({
        label: "Updated Hosting",
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(403);

    await request(app().getHttpServer())
      .delete(`/applications/${application.id}/hostings/${hostingId}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(403);

    // Add write permission again
    await actorType.update(["writeHostings"]);

    // Should succeed to update the hosting
    await request(app().getHttpServer())
      .patch(`/applications/${application.id}/hostings/${hostingId}`)
      .send({
        label: "Updated Hosting",
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    // Should succeed to delete the hosting
    await request(app().getHttpServer())
      .delete(`/applications/${application.id}/hostings/${hostingId}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(204);

    // Finally delete the actor type
    await actorType.delete();
  });
});
