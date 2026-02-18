import type { AsyncReturnType } from "src/utils/types.util";
import type { UserFakerReturnType } from "./fakers/user.faker";
import { faker } from "@faker-js/faker";
import { AdminLevel } from "src/user/entities/user.entity";
import request from "supertest";
import { ActorTypeFaker } from "./fakers/actor-type.faker";
import { ActorFaker } from "./fakers/actor.faker";
import { ApplicationFaker } from "./fakers/application.faker";
import { TagFaker } from "./fakers/tag.faker";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

describe("Applications", () => {
  const app = setupTestSuite();
  let user: UserFakerReturnType;
  let TOKEN: string;
  let createdApplicationId: string;

  beforeAll(async () => {
    user = await UserFaker.create({
      adminLevel: AdminLevel.READ,
      capabilities: [],
    });
    TOKEN = await getToken(user);
  });

  it("/GET applications/search", async () => {
    await request(app().getHttpServer())
      .get("/applications/search")
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    await request(app().getHttpServer())
      .get("/applications/search")
      .query({
        search: "test",
        page: 0,
        pageSize: 10,
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    await request(app().getHttpServer())
      .get("/applications/search")
      .query({
        label: "test app",
        sortBy: "label",
        order: "asc",
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);
  });

  it("/POST applications, with missing capabilities", async () => {
    await request(app().getHttpServer())
      .post("/applications")
      .send({
        label: faker.company.name(),
        shortName: "complete-app",
        description: faker.company.catchPhrase(),
        purposes: ["finance", "HR", "operations"],
        tags: [],
        status: { status: "in_production" },
        labels: [],
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(403);
  });

  it("/POST applications", async () => {
    await user.update({ capabilities: ["CreateApplication"] });
    const tag1 = await TagFaker.create();
    const tag2 = await TagFaker.create();
    const response = await request(app().getHttpServer())
      .post("/applications")
      .send({
        label: faker.company.name(),
        shortName: "complete-app",
        description: faker.company.catchPhrase(),
        purposes: ["finance", "HR", "operations"],
        tags: [tag1.name, tag2.name],
        status: { status: "in_production" },
        labels: [],
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(201);

    // Store the created application ID for the delete test
    createdApplicationId = response.body.id;
  });

  it("/POST applications - should accept missing priorityRestart", async () => {
    await user.update({ capabilities: ["CreateApplication"] });

    const response = await request(app().getHttpServer())
      .post("/applications")
      .send({
        label: "Application (sans priorité)",
        description: faker.company.catchPhrase(),
        status: { status: "in_production" },
        tags: [],
        labels: [],
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(201);

    expect(response.body.priorityRestart).toBeNull();
  });

  it("/DELETE applications/:id - should delete application with all related metadata", async () => {
    const user = await UserFaker.create({ adminLevel: AdminLevel.ADMIN });
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

  it("/POST applications - should fail with empty label", async () => {
    await user.update({ capabilities: ["CreateApplication"] });

    const response = await request(app().getHttpServer())
      .post("/applications")
      .send({
        label: "",
        description: faker.company.catchPhrase(),
        status: { status: "in_production" },
        tags: [],
        labels: [],
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(400);

    expect(response.body.message).toContain(
      "Le label doit contenir au moins 2 caractères",
    );
  });

  it("/POST applications - should fail with empty description", async () => {
    await user.update({ capabilities: ["CreateApplication"] });

    await request(app().getHttpServer())
      .post("/applications")
      .send({
        label: faker.company.name(),
        description: "",
        status: { status: "in_production" },
        tags: [],
        labels: [],
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(400);
  });
});

describe("application guard", () => {
  const app = setupTestSuite();
  let appOwner: UserFakerReturnType;
  let appActor: UserFakerReturnType;
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
