import { Roles } from "@prisma/client";
import request from "supertest";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";
import { Permission } from "@prisma/client";
import { ApplicationFaker } from "./fakers/application.faker";
import { DataSourceFaker } from "./fakers/data-source.faker";
import { DataSourceTypeFaker } from "./fakers/data-source-type.faker";
import { FamilyFaker } from "./fakers/family.faker";
import { SensibilityFaker } from "./fakers/sensibility.faker";
import { UpdateFrequencyFaker } from "./fakers/update-frequency.faker";

describe("DataSources", () => {
  const app = setupTestSuite();
  let user: Awaited<ReturnType<typeof UserFaker.create>>;
  let TOKEN: string;
  let application: { id: string };

  beforeAll(async () => {
    user = await UserFaker.create({ role: Roles.READER });
    TOKEN = await getToken(user);
    application = await ApplicationFaker.create(user);
  });

  it("/GET applications/:applicationId/data-source", async () => {
    const type = await DataSourceTypeFaker.create();
    const sensibility = await SensibilityFaker.create();
    const family = await FamilyFaker.create();
    const updateFrequency = await UpdateFrequencyFaker.create();

    await DataSourceFaker.create({
      application,
      user,
      type,
      sensibility,
      family,
      updateFrequency,
    });

    await request(app().getHttpServer())
      .get(`/applications/${application.id}/data-source`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);
  });

  it("/POST applications/:applicationId/data-source, without permissions", async () => {
    return request(app().getHttpServer())
      .post(`/applications/${application.id}/data-source`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({
        name: "Test data source",
      })
      .expect(403);
  });

  it("/POST applications/:applicationId/data-source", async () => {
    await user.update({
      additionalPermissions: [Permission.AppWrite],
    });

    const response = await request(app().getHttpServer())
      .post(`/applications/${application.id}/data-source`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({
        name: "Test data source",
      });

    expect(response.status).toBe(201);
  });
});
