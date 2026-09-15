import { Logger } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { configs } from "./index";
import { jwtValidationConfig } from "./jwt-validation.config";

describe("jwtValidationConfig", () => {
  const initialEnv = { ...process.env };

  beforeEach(() => {
    process.env.NODE_ENV = "production";
    delete process.env.DISABLE_JWT_VALIDATION;
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = { ...initialEnv };
    jest.restoreAllMocks();
  });

  it.each([undefined, "", "false", "0", "1", "TRUE", " true "])(
    "keeps verification enabled for %p, including in production",
    (value) => {
      if (value !== undefined) process.env.DISABLE_JWT_VALIDATION = value;

      expect(jwtValidationConfig()).toEqual({ disabled: false });
      expect(Logger.prototype.warn).not.toHaveBeenCalled();
    },
  );

  it("allows an explicit development bypass and warns at startup", () => {
    process.env.NODE_ENV = "development";
    process.env.DISABLE_JWT_VALIDATION = "true";

    expect(jwtValidationConfig()).toEqual({ disabled: true });
    expect(Logger.prototype.warn).toHaveBeenCalledTimes(1);
    expect(Logger.prototype.warn).toHaveBeenCalledWith(
      expect.stringContaining("sans vérification de signature"),
    );
  });

  it.each(["production", "test", "staging", "", undefined])(
    "rejects the bypass when NODE_ENV is %p",
    (environment) => {
      if (environment === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = environment;
      process.env.DISABLE_JWT_VALIDATION = "true";

      expect(() => jwtValidationConfig()).toThrow(
        "DISABLE_JWT_VALIDATION=true est autorisé uniquement avec NODE_ENV=development.",
      );
    },
  );

  it("rejects application configuration at startup even when auth level checks are off", async () => {
    process.env.DISABLE_JWT_VALIDATION = "true";
    process.env.AUTH_LEVEL_MODE = "off";
    process.env.DATABASE_URL = "postgresql://localhost/refapp-config-test";
    process.env.OIDC_JWKS_URL = "https://idp.example.test/jwks";
    process.env.OIDC_CONFIG_URL = "https://idp.example.test/config";
    process.env.OIDC_CLIENT_ID = "test-client";

    await expect(
      Test.createTestingModule({
        imports: [ConfigModule.forRoot({ ignoreEnvFile: true, load: configs })],
      }).compile(),
    ).rejects.toThrow(/DISABLE_JWT_VALIDATION=true.*NODE_ENV=development/);
  });
});
