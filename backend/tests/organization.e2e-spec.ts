import request from "supertest";
import { setupTestSuite } from "./setup";
import { getToken } from "./getToken";
import { UserFaker } from "./fakers/user.faker";
import { OrganizationFaker } from "./fakers/organization.faker";
import { getPrismaClient } from "./fakers/prisma";
import { AdminLevel } from "src/user/entities/user.entity";

describe("Organizations", () => {
  const app = setupTestSuite();
  const prisma = getPrismaClient();
  let user: { keycloakId: string };
  let TOKEN: string;

  beforeAll(async () => {
    user = await UserFaker.create(AdminLevel.WRITE);
    TOKEN = await getToken(user);
  });
  afterAll(async () => {
    prisma.$disconnect();
  });

  it("/POST organizations", async () => {
    await request(app().getHttpServer())
      .post("/organizations")
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({
        label: "Test Organization",
        url: "http://example.com",
        sigle: "TEST",
      })
      .expect(201);
  });

  it("/GET organizations", async () => {
    await request(app().getHttpServer())
      .get("/organizations")
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);
  });

  it("/GET organizations/:id", async () => {
    const organization = await OrganizationFaker.create();
    await request(app().getHttpServer())
      .get(`/organizations/${organization.id}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);
  });

  it("/PATCH organizations/:id", async () => {
    const organization = await OrganizationFaker.create();
    const organizationParent = await OrganizationFaker.create();
    await request(app().getHttpServer())
      .patch(`/organizations/${organization.id}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({ label: "Updated Organization", parentId: organizationParent.id })
      .expect(200);
  });

  it("/DELETE organizations/:id", async () => {
    const organization = await OrganizationFaker.create();
    await request(app().getHttpServer())
      .delete(`/organizations/${organization.id}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);
  });
});
