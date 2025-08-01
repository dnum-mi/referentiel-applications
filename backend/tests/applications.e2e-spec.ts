import request from "supertest";
import { setupTestSuite } from "./setup";
import { getToken } from "./getToken";
import { UserFaker } from "./fakers/user.faker";
import { faker } from "@faker-js/faker";
import { ActorTypeFaker } from "./fakers/actor-type.faker";
import { ApplicationFaker } from "./fakers/application.faker";
import type { AsyncReturnType } from "src/utils/types.util";
import { ActorFaker } from "./fakers/actor.faker";
import { AdminLevel } from "src/user/entities/user.entity";

describe("Applications", () => {
  const app = setupTestSuite();
  let user: { keycloakId: string };
  let TOKEN: string;
  let createdApplicationId: string;

  beforeAll(async () => {
    user = await UserFaker.create(AdminLevel.WRITE);
    TOKEN = await getToken(user);
  });

  it("/GET applications", async () => {
    await request(app().getHttpServer())
      .get("/applications")
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);
  });

  it("/GET applications/search", async () => {
    await request(app().getHttpServer())
      .get("/applications/search")
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);
  });

  it("/POST applications", async () => {
    const response = await request(app().getHttpServer())
      .post("/applications")
      .send({
        label: faker.company.name(),
        shortName: "complete-app",
        description: faker.company.catchPhrase(),
        purposes: ["finance", "HR", "operations"],
        tags: ["tag1", "tag2", "tag3"],
        parentId: null,
        lifecycle: {
          status: "in_production",
          firstProductionDate: "2025-01-06T10:34:25.061Z",
          plannedDecommissioningDate: "2030-12-31T23:59:59.000Z",
        },
        actors: [
          {
            role: "dev",
            userId: user.keycloakId,
          },
        ],
        compliances: [],
        externals: [],
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(201);

    // Store the created application ID for the delete test
    createdApplicationId = response.body.id;
  });

  it("/DELETE applications/:id - should delete application with all related metadata", async () => {
    const user = await UserFaker.create(AdminLevel.ADMIN);
    const TOKEN = await getToken(user);

    await request(app().getHttpServer())
      .get(`/applications/${createdApplicationId}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    await request(app().getHttpServer())
      .delete(`/applications/${createdApplicationId}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(204);

    await request(app().getHttpServer())
      .get(`/applications/${createdApplicationId}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(404);
  });
});

describe("application guard", () => {
  const app = setupTestSuite();
  let appOwner: { keycloakId: string, email: string };
  let appActor: { keycloakId: string, email: string };
  let TOKEN: string;
  let actorType: AsyncReturnType<typeof ActorTypeFaker.create>;
  let application: AsyncReturnType<typeof ApplicationFaker.create>;

  beforeAll(async () => {
    appOwner = await UserFaker.create();
    appActor = await UserFaker.create();
    application = await ApplicationFaker.create(appOwner);
    actorType = await ActorTypeFaker.create([]);
    await ActorFaker.link({
      userEmail: appActor.email,
      actorTypeId: actorType.id,
      applicationId: application.id,
    });
    TOKEN = await getToken(appActor);
  });

  afterAll(async () => {
    await actorType.delete();
  });

  it("permissions testing", async () => {
    // remove all permission
    await actorType.update([], { reset: true });
    // Should fail to get the relation because the user does not have the read permission
    await request(app().getHttpServer())
      .get(`/applications/${application.id}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(403);

    // Should fail to list relations because the user does not have the read permission
    await request(app().getHttpServer())
      .get(`/applications/${application.id}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(403);

    // Add read permission
    await actorType.update(["readBase"]);

    // Should succeed to get the application
    await request(app().getHttpServer())
      .get(`/applications/${application.id}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    // should fail on write permission
    await request(app().getHttpServer())
      .patch(`/applications/${application.id}`)
      .send({
        description: "Updated description",
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(403);

    // Add write permission again
    await actorType.update(["writeBase"]);

    // Should succeed to update the relation
    await request(app().getHttpServer())
      .patch(`/applications/${application.id}`)
      .send({
        description: "Updated description",
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    // Should failed to delete the application because it's an admin privilege
    // TODO should be fixed in the future with global permissions
    // await request(app().getHttpServer())
    //   .delete(`/applications/${application.id}`)
    //   .set('Authorization', `Bearer ${TOKEN}`)
    //   .expect(403);
  });
});
