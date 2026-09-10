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
      oidcScope: "openid profile email",
      version: expect.any(String),
    });
    // #1985 : hors mode enforce (jest.setup force `off`), rien sur le niveau d'authentification
    // ne sort de cette route publique.
    expect(response.body.authLevel).toBeUndefined();
  });
});
