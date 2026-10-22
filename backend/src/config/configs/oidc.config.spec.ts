import oidcConfig from "./oidc.config";

describe("OIDC access-token configuration", () => {
  const initialEnv = { ...process.env };

  beforeEach(() => {
    process.env = {
      ...initialEnv,
      OIDC_JWKS_URL: "http://internal-idp:8080/jwks",
      OIDC_CONFIG_URL:
        "https://idp.example.test/.well-known/openid-configuration",
      OIDC_CLIENT_ID: "browser-client",
      OIDC_ISSUER: "https://idp.example.test/realm/",
      OIDC_AUDIENCES: "refapp-api, urn:refapp:legacy",
    };
  });

  afterEach(() => {
    process.env = { ...initialEnv };
  });

  it("keeps resource audiences independent of the browser client and issuer independent of JWKS", () => {
    expect(oidcConfig()).toMatchObject({
      issuer: "https://idp.example.test/realm/",
      audiences: ["refapp-api", "urn:refapp:legacy"],
      clientId: "browser-client",
      jwksUrl: "http://internal-idp:8080/jwks",
    });
  });

  it("trims configuration and deduplicates audiences while preserving the exact issuer path", () => {
    process.env.OIDC_ISSUER = " https://idp.example.test/realm/ ";
    process.env.OIDC_AUDIENCES =
      " refapp-api , urn:refapp:legacy , refapp-api ";
    expect(oidcConfig().issuer).toBe("https://idp.example.test/realm/");
    expect(oidcConfig().audiences).toEqual(["refapp-api", "urn:refapp:legacy"]);
  });

  it("supports the explicit local HTTP issuer without contacting discovery", () => {
    process.env.OIDC_ISSUER = "http://localhost:8082/realms/refapp";
    process.env.OIDC_CONFIG_URL = "http://unreachable.example.test/config";
    expect(oidcConfig().issuer).toBe("http://localhost:8082/realms/refapp");
  });

  it.each([undefined, "", "   "])(
    "refuses a missing issuer (%p) instead of inferring it from another URL",
    (value) => {
      if (value === undefined) delete process.env.OIDC_ISSUER;
      else process.env.OIDC_ISSUER = value;
      expect(() => oidcConfig()).toThrow(/OIDC_ISSUER/);
    },
  );

  it.each([
    "issuer",
    "ftp://idp.example.test",
    "https://user:secret@idp.example.test",
    "https://idp.example.test/?tenant=refapp",
    "https://idp.example.test/#realm",
  ])("refuses an invalid OIDC issuer (%s)", (issuer) => {
    process.env.OIDC_ISSUER = issuer;
    expect(() => oidcConfig()).toThrow(/OIDC_ISSUER/);
  });

  it.each([
    undefined,
    "",
    "   ",
    ",",
    "refapp-api,",
    ",refapp-api",
    "refapp-api,,legacy",
  ])(
    "refuses absent or incomplete resource audiences (%p) instead of using the browser client",
    (value) => {
      if (value === undefined) delete process.env.OIDC_AUDIENCES;
      else process.env.OIDC_AUDIENCES = value;
      expect(() => oidcConfig()).toThrow(/OIDC_AUDIENCES/);
    },
  );
});
