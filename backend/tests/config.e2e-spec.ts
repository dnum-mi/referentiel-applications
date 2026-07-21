import request from "supertest";
import { FeatureFlagKey } from "../src/feature-flag/feature-flag.keys";
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

  it("/GET config exposes only ENABLED feature flags from the catalog", async () => {
    const response = await request(app().getHttpServer())
      .get("/config")
      .expect(200);

    expect(response.body).toHaveProperty("featureFlags");
    const featureFlags = response.body.featureFlags as Record<string, boolean>;
    expect(Array.isArray(featureFlags)).toBe(false);

    // L'endpoint est public : il ne liste QUE les flags activés (une clé
    // absente vaut « désactivé » côté front) et ne divulgue jamais les
    // fonctionnalités coupées. Toute clé exposée appartient au catalogue.
    for (const [key, value] of Object.entries(featureFlags)) {
      expect(value).toBe(true);
      expect(Object.values(FeatureFlagKey)).toContain(key);
    }
  });
});
