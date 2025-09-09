import request from "supertest";
import { setupTestSuite } from "./setup";

describe("Config", () => {
  const app = setupTestSuite();

  it("/GET config, unauthenticated", async () => {
    const response = await request(app().getHttpServer())
      .get("/config")
      .expect(200);

    expect(response.body).toMatchObject({
      keycloakClientId: expect.any(String),
      keycloakRealm: expect.any(String),
      keycloakUrl: expect.any(String),
      version: expect.any(String),
    });
  });
});
