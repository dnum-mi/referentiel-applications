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
});
