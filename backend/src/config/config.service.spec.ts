import appConfig from "./configs/app.config";
import { ConfigService } from "./config.service";

describe("public configuration", () => {
  it("never exposes the userinfo signing secret or algorithm to the frontend", () => {
    const secret = "userinfo-test-secret".repeat(4);
    const service = new ConfigService(
      appConfig(),
      {
        jwksUrl: "https://idp.example/jwks",
        configUrl: "https://idp.example/.well-known/openid-configuration",
        clientId: "refapp",
        scope: "openid profile email",
      },
      {
        mode: "enforce",
        claim: "auth_mode",
        strongValues: ["card"],
        trustedIdps: [],
        reauth: { enabled: true, prompt: "login", strategy: "prompt" },
        userinfo: {
          enabled: true,
          timeoutMs: 2000,
          hmac: { algorithm: "HS256", secret },
        },
      },
    );
    const frontend = service.getFrontendConfig();
    expect(frontend.authLevel).toEqual({
      reauth: { strategy: "prompt", prompt: "login" },
      helpUrl: undefined,
    });
    expect(JSON.stringify(frontend)).not.toContain(secret);
    expect(JSON.stringify(frontend)).not.toContain("HS256");
  });

  it("never exposes the Grist API key to the frontend", () => {
    const apiKey = "grist-test-api-key".repeat(4);
    const previous = process.env.GRIST_API_KEY;
    process.env.GRIST_API_KEY = apiKey;
    try {
      const service = new ConfigService(
        appConfig(),
        {
          jwksUrl: "https://idp.example/jwks",
          configUrl: "https://idp.example/.well-known/openid-configuration",
          clientId: "refapp",
          scope: "openid profile email",
        },
        {
          mode: "off",
          claim: "auth_mode",
          strongValues: [],
          trustedIdps: [],
          reauth: { enabled: false, prompt: "login", strategy: "prompt" },
          userinfo: { enabled: false, timeoutMs: 2000 },
        },
      );
      expect(JSON.stringify(service.getFrontendConfig())).not.toContain(apiKey);
    } finally {
      if (previous === undefined) delete process.env.GRIST_API_KEY;
      else process.env.GRIST_API_KEY = previous;
    }
  });
});
