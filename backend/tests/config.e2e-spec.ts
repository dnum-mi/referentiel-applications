import request from "supertest";
import { setupTestSuite } from "./setup";

describe("Config", () => {
  const app = setupTestSuite();

  it("/GET config, unauthenticated", async () => {
    const response = await request(app().getHttpServer())
      .get("/config")
      .expect(200);

    expect(response.body).toMatchObject({
      oidcClientId: expect.any(String),
      oidcConfigUrl: expect.any(String),
      version: expect.any(String),
    });
  });
});
