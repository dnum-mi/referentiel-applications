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

  it("/GET config exposes the feature flags map", async () => {
    const response = await request(app().getHttpServer())
      .get("/config")
      .expect(200);

    expect(response.body).toHaveProperty("featureFlags");
    expect(typeof response.body.featureFlags).toBe("object");
    expect(Array.isArray(response.body.featureFlags)).toBe(false);
    // Toutes les valeurs exposées sont des booléens.
    for (const value of Object.values(response.body.featureFlags)) {
      expect(typeof value).toBe("boolean");
    }
  });
});
