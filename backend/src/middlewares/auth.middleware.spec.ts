import type { ConfigType } from "@nestjs/config";
import { SignJWT } from "jose";
import type { NextFunction, Request, Response } from "express";
import { AuthLevel, Permission, Roles, UserType } from "@prisma/client";
import type { LoggerService } from "src/logger/logger.service";
import type { MaintenanceService } from "src/maintenance/maintenance.service";
import type { TokenService } from "src/token/token.service";
import type { ScopedPermissionService } from "src/user/scope-permission/scoped-permission.service";
import type { UserConnexionLogService } from "src/user/user-connexion-log.service";
import type { UserService } from "src/user/user.service";
import type { OidcConfig } from "src/config/configs/oidc.config";
import type { authLevelConfig } from "src/config/configs/auth-level.config";
import { roleToPermissions } from "src/permissions/role-to-permissions";
import { AuthMiddleware } from "./auth.middleware";

jest.mock("src/logger/logger.service", () => ({
  LoggerService: class LoggerService {},
}));
jest.mock("src/maintenance/maintenance.service", () => ({
  MaintenanceService: class MaintenanceService {},
}));
jest.mock("src/token/token.service", () => ({
  TokenService: class TokenService {},
}));
jest.mock("src/user/user-connexion-log.service", () => ({
  UserConnexionLogService: class UserConnexionLogService {},
}));
jest.mock("src/user/user.service", () => ({
  UserService: class UserService {},
}));
jest.mock("src/user/scope-permission/scoped-permission.service", () => ({
  ScopedPermissionService: class ScopedPermissionService {},
}));

type AuthLevelConfigType = ConfigType<typeof authLevelConfig>;

const oidcConfig = {
  jwksUrl: "https://example.test/.well-known/jwks.json",
  configUrl: "https://example.test/.well-known/openid-configuration",
  clientId: "refapp",
  scope: "openid profile email",
} as ConfigType<() => OidcConfig>;

// Configurations littérales, indépendantes de process.env : les specs documentent
// chaque mode explicitement.
const authLevelOff: AuthLevelConfigType = {
  mode: "off",
  strongValues: [],
  trustedIdps: [],
  reauth: { enabled: true, prompt: "login", strategy: "prompt" },
  userinfo: { enabled: false, timeoutMs: 2000 },
};
const authLevelEnforce: AuthLevelConfigType = {
  mode: "enforce",
  claim: "auth_mode",
  strongValues: ["card"],
  idpClaim: "auth_idp",
  trustedIdps: ["partenaire"],
  reauth: { enabled: true, prompt: "login", strategy: "prompt" },
  userinfo: { enabled: false, timeoutMs: 2000 },
};
const authLevelObserve: AuthLevelConfigType = {
  ...authLevelEnforce,
  mode: "observe",
};

interface TestUser {
  id: string;
  email: string;
  role: Roles;
  type: UserType;
  organizationId: string | null;
  scopeOrganizationId: string | null;
  additionalPermissions: Permission[];
  emailNotificationsEnabled: boolean;
  followedApplications: never[];
  organization: { id: string; path: string } | null;
  scopeOrganization: { id: string; path: string } | null;
  isBlocked: boolean;
}

const existingUser: TestUser = {
  id: "user-id",
  email: "reader@example.test",
  role: Roles.READER,
  type: UserType.human,
  organizationId: null,
  scopeOrganizationId: null,
  additionalPermissions: [],
  emailNotificationsEnabled: true,
  followedApplications: [],
  organization: null,
  scopeOrganization: null,
  isBlocked: false,
};

const adminUser: TestUser = {
  ...existingUser,
  id: "admin-id",
  email: "admin@example.test",
  role: Roles.ADMIN,
  organizationId: "org-1",
  organization: { id: "org-1", path: "MI/DNUM" },
  scopeOrganizationId: "scope-1",
  scopeOrganization: { id: "scope-1", path: "MI" },
  additionalPermissions: [Permission.DataExport],
};

const visitorUser: TestUser = {
  ...existingUser,
  id: "visitor-id",
  role: Roles.VISITOR,
};

interface MiddlewareOptions {
  authLevel?: AuthLevelConfigType;
  user?: TestUser;
  tokenUser?: TestUser | null;
  maintenanceActive?: boolean;
  logCreated?: boolean;
}

function buildMiddleware({
  authLevel = authLevelOff,
  user = existingUser,
  tokenUser = null,
  maintenanceActive = false,
  logCreated = false,
}: MiddlewareOptions = {}) {
  const userService = {
    findByEmailWithRelations: jest.fn().mockResolvedValue(user),
    findOrCreateByEmail: jest.fn().mockResolvedValue(user),
    findByIdWithRelations: jest.fn().mockResolvedValue(existingUser),
    stopImpersonation: jest.fn().mockResolvedValue(undefined),
  };
  const scopedPermissionService = {
    assertCanImpersonate: jest.fn().mockResolvedValue(undefined),
  };
  const tokenService = {
    findUserByToken: jest.fn().mockResolvedValue(tokenUser),
  };
  const userConnexionLogService = {
    log: jest.fn().mockResolvedValue({ created: logCreated }),
  };
  const logger = { error: jest.fn(), warn: jest.fn(), log: jest.fn() };
  const maintenanceService = {
    isActive: jest.fn().mockResolvedValue(maintenanceActive),
  };
  const middleware = new AuthMiddleware(
    oidcConfig,
    userService as unknown as UserService,
    scopedPermissionService as unknown as ScopedPermissionService,
    tokenService as unknown as TokenService,
    userConnexionLogService as unknown as UserConnexionLogService,
    logger as unknown as LoggerService,
    maintenanceService as unknown as MaintenanceService,
    authLevel,
  );
  return {
    middleware,
    userService,
    scopedPermissionService,
    tokenService,
    userConnexionLogService,
    logger,
  };
}

function bearerRequest(
  payload: Record<string, unknown>,
  headers: Record<string, string> = {},
  extra: Partial<Request> = {},
): Request {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return {
    ...extra,
    headers: {
      authorization: `Bearer eyJhbGciOiJub25lIn0.${encoded}.signature`,
      ...headers,
    },
  } as unknown as Request;
}

function run(
  middleware: AuthMiddleware,
  request: Request,
): Promise<{ response: Response; next: NextFunction }> {
  const response = {
    status: jest.fn(),
    json: jest.fn(),
  } as unknown as Response;
  const next = jest.fn() as NextFunction;
  return middleware
    .use(request, response, next)
    .then(() => ({ response, next }));
}

describe("AuthMiddleware", () => {
  const previousDisableJwtValidation = process.env.DISABLE_JWT_VALIDATION;

  beforeAll(() => {
    process.env.DISABLE_JWT_VALIDATION = "true";
  });

  afterAll(() => {
    process.env.DISABLE_JWT_VALIDATION = previousDisableJwtValidation;
  });

  describe("maintenance mode", () => {
    it("authenticates an existing user without creating or logging it", async () => {
      const { middleware, userService, userConnexionLogService } =
        buildMiddleware();
      const request = bearerRequest({ email: existingUser.email }, {}, {
        maintenanceMode: true,
      } as Partial<Request>);

      const { next } = await run(middleware, request);

      expect(userService.findByEmailWithRelations).toHaveBeenCalledWith(
        existingUser.email,
      );
      expect(userService.findOrCreateByEmail).not.toHaveBeenCalled();
      expect(userConnexionLogService.log).not.toHaveBeenCalled();
      expect(request.user).toMatchObject({
        id: existingUser.id,
        email: existingUser.email,
        role: Roles.READER,
      });
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("does not update an expired API token in maintenance mode", async () => {
      const { middleware, tokenService, userConnexionLogService } =
        buildMiddleware({ tokenUser: existingUser });
      const request = {
        maintenanceMode: true,
        headers: { "x-refapp-token": "api-key" },
      } as unknown as Request;

      await run(middleware, request);

      expect(tokenService.findUserByToken).toHaveBeenCalledWith("api-key", {
        readOnly: true,
      });
      expect(userConnexionLogService.log).not.toHaveBeenCalled();
    });
  });

  describe("blocked user", () => {
    it("rejects a blocked user with a 403 instead of setting req.user", async () => {
      const { middleware, userConnexionLogService } = buildMiddleware({
        user: { ...existingUser, isBlocked: true },
      });
      const request = bearerRequest({ email: existingUser.email });

      const { response, next } = await run(middleware, request);

      expect(response.status).toHaveBeenCalledWith(403);
      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({ blocked: true }),
      );
      expect(request.user).toBeUndefined();
      expect(next).not.toHaveBeenCalled();
      expect(userConnexionLogService.log).not.toHaveBeenCalled();
    });

    // Le blocage administratif prime sur tout : aucune évaluation ne doit
    // masquer ni contourner le refus.
    it("blocks before any authentication level evaluation", async () => {
      const { middleware } = buildMiddleware({
        authLevel: authLevelEnforce,
        user: { ...adminUser, isBlocked: true },
      });
      const request = bearerRequest({
        email: adminUser.email,
        auth_mode: "PASSWORD",
      });

      const { response, next } = await run(middleware, request);

      expect(response.status).toHaveBeenCalledWith(403);
      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({ blocked: true }),
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("authentication level (#1985)", () => {
    it("leaves the principal untouched in mode off and exposes no authLevel", async () => {
      const { middleware, userConnexionLogService } = buildMiddleware({
        user: adminUser,
      });
      const request = bearerRequest({
        email: adminUser.email,
        auth_mode: "PASSWORD",
      });

      const { next } = await run(middleware, request);

      expect(request.user).toMatchObject({
        role: Roles.ADMIN,
        additionalPermissions: [Permission.DataExport],
        scopeOrganizationId: "scope-1",
      });
      expect(request.user?.authLevel).toBeUndefined();
      expect(userConnexionLogService.log).toHaveBeenCalledWith(adminUser.id, {
        level: AuthLevel.unknown,
        reason: "disabled",
      });
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("keeps full rights on a strong session in mode enforce", async () => {
      const { middleware } = buildMiddleware({
        authLevel: authLevelEnforce,
        user: adminUser,
      });
      const request = bearerRequest({
        email: adminUser.email,
        auth_mode: "CARD",
      });

      await run(middleware, request);

      expect(request.user).toMatchObject({
        role: Roles.ADMIN,
        additionalPermissions: [Permission.DataExport],
        scopeOrganizationId: "scope-1",
        scopeOrganization: { path: "MI" },
        permissions: roleToPermissions(Roles.ADMIN, { scoped: true }),
        authLevel: {
          level: AuthLevel.strong,
          downgraded: false,
          reason: "strong-method",
        },
      });
    });

    // INVARIANT : la forme exacte du principal standard. Les quatre champs sont
    // réécrits, l'identité et l'organisation (couche 3) sont conservées.
    it("steps the principal down to a standard user on a weak session in mode enforce", async () => {
      const { middleware } = buildMiddleware({
        authLevel: authLevelEnforce,
        user: adminUser,
      });
      const request = bearerRequest({
        email: adminUser.email,
        auth_mode: "PASSWORD",
      });

      const { next } = await run(middleware, request);

      expect(request.user).toEqual({
        ...adminUser,
        role: Roles.VISITOR,
        additionalPermissions: [],
        scopeOrganizationId: null,
        scopeOrganization: null,
        permissions: roleToPermissions(Roles.VISITOR),
        authLevel: {
          level: AuthLevel.weak,
          downgraded: true,
          reason: "weak-method",
        },
      });
      // Le rôle réel n'est jamais exposé à une session faible, pas même via authLevel.
      expect(Object.keys(request.user?.authLevel ?? {}).sort()).toEqual([
        "downgraded",
        "level",
        "reason",
      ]);
      expect(request.user?.organizationId).toBe("org-1");
      expect(request.user?.email).toBe(adminUser.email);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("treats a missing claim as a weak session in mode enforce", async () => {
      const { middleware } = buildMiddleware({
        authLevel: authLevelEnforce,
        user: adminUser,
      });
      const request = bearerRequest({ email: adminUser.email });

      await run(middleware, request);

      expect(request.user).toMatchObject({
        role: Roles.VISITOR,
        authLevel: {
          level: AuthLevel.unknown,
          downgraded: true,
          reason: "claim-missing",
        },
      });
    });

    it("trusts a listed identity provider without any mode claim", async () => {
      const { middleware } = buildMiddleware({
        authLevel: authLevelEnforce,
        user: adminUser,
      });
      const request = bearerRequest({
        email: adminUser.email,
        auth_idp: "Partenaire",
      });

      await run(middleware, request);

      expect(request.user).toMatchObject({
        role: Roles.ADMIN,
        authLevel: {
          level: AuthLevel.strong,
          downgraded: false,
          reason: "trusted-idp",
        },
      });
    });

    it("evaluates without downgrading in mode observe", async () => {
      const { middleware, userConnexionLogService } = buildMiddleware({
        authLevel: authLevelObserve,
        user: adminUser,
      });
      const request = bearerRequest({
        email: adminUser.email,
        auth_mode: "PASSWORD",
      });

      await run(middleware, request);

      expect(request.user).toMatchObject({
        role: Roles.ADMIN,
        additionalPermissions: [Permission.DataExport],
        scopeOrganizationId: "scope-1",
        authLevel: {
          level: AuthLevel.weak,
          downgraded: false,
          reason: "weak-method",
        },
      });
      expect(userConnexionLogService.log).toHaveBeenCalledWith(adminUser.id, {
        level: AuthLevel.weak,
        reason: "weak-method",
        claimValue: "PASSWORD",
        idp: undefined,
      });
    });

    // Un jeton API est une authentification machine : jamais évalué, jamais rétrogradé.
    it("never evaluates the API token branch", async () => {
      const { middleware, tokenService, userConnexionLogService } =
        buildMiddleware({ authLevel: authLevelEnforce, tokenUser: adminUser });
      const request = {
        headers: { "x-refapp-token": "api-key" },
      } as unknown as Request;

      await run(middleware, request);

      expect(tokenService.findUserByToken).toHaveBeenCalledWith("api-key", {
        readOnly: false,
      });
      expect(request.user).toMatchObject({ role: Roles.ADMIN });
      expect(request.user?.authLevel).toBeUndefined();
      expect(userConnexionLogService.log).toHaveBeenCalledWith(
        adminUser.id,
        undefined,
      );
    });
  });

  describe("userinfo fallback (#1985)", () => {
    const withUserinfo: AuthLevelConfigType = {
      ...authLevelEnforce,
      userinfo: {
        enabled: true,
        url: "https://idp.example/oauth2/userinfo",
        timeoutMs: 2000,
      },
    };
    let fetchSpy: jest.SpyInstance;

    afterEach(() => fetchSpy?.mockRestore());

    function mockUserinfo(body: unknown, status = 200) {
      fetchSpy = jest.spyOn(globalThis, "fetch").mockImplementation(
        async () =>
          new globalThis.Response(JSON.stringify(body), {
            status,
            headers: { "content-type": "application/json" },
          }),
      );
    }

    it("reads the mode on userinfo when the access token lacks it", async () => {
      mockUserinfo({ sub: "sub-1", auth_mode: "CARD" });
      const { middleware, userConnexionLogService } = buildMiddleware({
        authLevel: withUserinfo,
        user: adminUser,
      });
      const request = bearerRequest({ email: adminUser.email, sub: "sub-1" });

      await run(middleware, request);

      expect(fetchSpy).toHaveBeenCalledWith(
        "https://idp.example/oauth2/userinfo",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringMatching(/^Bearer /),
          }),
        }),
      );
      expect(request.user).toMatchObject({
        role: Roles.ADMIN,
        authLevel: {
          level: AuthLevel.strong,
          downgraded: false,
          reason: "strong-method",
        },
      });
      expect(userConnexionLogService.log).toHaveBeenCalledWith(
        adminUser.id,
        expect.objectContaining({ claimValue: "CARD", source: "userinfo" }),
      );
    });

    it("still steps down when userinfo carries a weak mode", async () => {
      mockUserinfo({ sub: "sub-1", auth_mode: "PASSWORD" });
      const { middleware } = buildMiddleware({
        authLevel: withUserinfo,
        user: adminUser,
      });
      const request = bearerRequest({ email: adminUser.email, sub: "sub-1" });

      await run(middleware, request);

      expect(request.user).toMatchObject({
        role: Roles.VISITOR,
        authLevel: { level: AuthLevel.weak, downgraded: true },
      });
    });

    it("checks userinfo before trusting a provider without a mode in the token", async () => {
      mockUserinfo({ sub: "sub-1", auth_mode: "PASSWORD" });
      const { middleware } = buildMiddleware({
        authLevel: { ...withUserinfo, trustedIdps: ["partenaire"] },
        user: adminUser,
      });
      const request = bearerRequest({
        email: adminUser.email,
        sub: "sub-1",
        auth_idp: "Partenaire",
      });

      await run(middleware, request);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(request.user).toMatchObject({
        role: Roles.VISITOR,
        authLevel: {
          level: AuthLevel.weak,
          downgraded: true,
          reason: "weak-method",
        },
      });
    });

    it("keeps explicit provider trust when neither source supplies a mode", async () => {
      mockUserinfo({ sub: "sub-1" });
      const { middleware } = buildMiddleware({
        authLevel: { ...withUserinfo, trustedIdps: ["partenaire"] },
        user: adminUser,
      });
      const request = bearerRequest({
        email: adminUser.email,
        sub: "sub-1",
        auth_idp: "Partenaire",
      });
      await run(middleware, request);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(request.user?.authLevel).toMatchObject({
        level: AuthLevel.strong,
        reason: "trusted-idp",
      });
    });

    // Fail-closed : un fournisseur injoignable n'accorde jamais rien sans confiance explicite.
    it("keeps a missing claim weak when userinfo fails", async () => {
      mockUserinfo({ error: "invalid_token" }, 401);
      const { middleware, logger } = buildMiddleware({
        authLevel: withUserinfo,
        user: adminUser,
      });
      const request = bearerRequest({ email: adminUser.email, sub: "sub-1" });

      await run(middleware, request);

      expect(request.user).toMatchObject({
        role: Roles.VISITOR,
        authLevel: { reason: "claim-missing", downgraded: true },
      });
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Repli userinfo en échec"),
      );
    });

    it("never calls userinfo when the access token already carries the mode", async () => {
      mockUserinfo({ sub: "sub-1", auth_mode: "PASSWORD" });
      const { middleware } = buildMiddleware({
        authLevel: withUserinfo,
        user: adminUser,
      });
      const request = bearerRequest({
        email: adminUser.email,
        sub: "sub-1",
        auth_mode: "CARD",
      });

      await run(middleware, request);

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(request.user?.authLevel?.level).toBe(AuthLevel.strong);
    });

    // Un fournisseur présent sur le jeton signé n'est jamais remplacé par celui de userinfo.
    it("never lets userinfo replace a value carried by the access token", async () => {
      mockUserinfo({ sub: "sub-1", auth_idp: "Partenaire" });
      const { middleware } = buildMiddleware({
        authLevel: withUserinfo,
        user: adminUser,
      });
      const request = bearerRequest({
        email: adminUser.email,
        sub: "sub-1",
        auth_idp: "Autre",
      });

      await run(middleware, request);

      expect(request.user).toMatchObject({
        role: Roles.VISITOR,
        authLevel: { reason: "untrusted-idp", downgraded: true },
      });
    });

    it.each([true, false])(
      "verifies signed HMAC userinfo before granting rights (valid: %s)",
      async (valid) => {
        const secret = "userinfo-test-secret-not-for-deployment-".repeat(2);
        const signingKey = new TextEncoder().encode(
          valid ? secret : "wrong-secret".repeat(8),
        );
        const signed = await new SignJWT({
          sub: "sub-1",
          iss: "https://example.test",
          aud: "refapp",
          auth_mode: "CARD",
        })
          .setProtectedHeader({ alg: "HS256" })
          .setExpirationTime("1m")
          .sign(signingKey);
        fetchSpy = jest.spyOn(globalThis, "fetch").mockResolvedValue(
          new globalThis.Response(signed, {
            headers: { "content-type": "application/jwt" },
          }),
        );
        const { middleware } = buildMiddleware({
          authLevel: {
            ...withUserinfo,
            userinfo: {
              ...withUserinfo.userinfo,
              hmac: { algorithm: "HS256", secret },
            },
          },
          user: adminUser,
        });
        const request = bearerRequest({
          email: adminUser.email,
          sub: "sub-1",
          iss: "https://example.test",
        });
        await run(middleware, request);
        expect(request.user?.role).toBe(valid ? Roles.ADMIN : Roles.VISITOR);
        expect(request.user?.authLevel?.downgraded).toBe(!valid);
      },
    );

    it("stays disabled unless explicitly enabled", async () => {
      mockUserinfo({ sub: "sub-1", auth_mode: "CARD" });
      const { middleware } = buildMiddleware({
        authLevel: authLevelEnforce,
        user: adminUser,
      });

      await run(
        middleware,
        bearerRequest({ email: adminUser.email, sub: "sub-1" }),
      );

      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe("impersonation", () => {
    it("still lets a strong administrator impersonate", async () => {
      const { middleware, userService, scopedPermissionService } =
        buildMiddleware({ authLevel: authLevelEnforce, user: adminUser });
      const request = bearerRequest(
        { email: adminUser.email, auth_mode: "CARD" },
        { "x-impersonate-user-id": existingUser.id },
      );

      const { next } = await run(middleware, request);

      expect(userService.findByIdWithRelations).toHaveBeenCalledWith(
        existingUser.id,
      );
      expect(scopedPermissionService.assertCanImpersonate).toHaveBeenCalled();
      expect(request.user).toMatchObject({ id: existingUser.id });
      expect(request.impersonator).toMatchObject({ id: adminUser.id });
      expect(next).toHaveBeenCalledTimes(1);
    });

    // En observe, rien ne change : l'impersonation d'un administrateur en session faible passe.
    it("does not interfere with impersonation in mode observe", async () => {
      const { middleware, userService } = buildMiddleware({
        authLevel: authLevelObserve,
        user: adminUser,
      });
      const request = bearerRequest(
        { email: adminUser.email, auth_mode: "PASSWORD" },
        { "x-impersonate-user-id": existingUser.id },
      );

      const { next } = await run(middleware, request);

      expect(userService.stopImpersonation).not.toHaveBeenCalled();
      expect(request.user).toMatchObject({ id: existingUser.id });
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("refuses impersonation on a weak session with a typed 403 and closes the audit session", async () => {
      const { middleware, userService, scopedPermissionService, logger } =
        buildMiddleware({ authLevel: authLevelEnforce, user: adminUser });
      const request = bearerRequest(
        { email: adminUser.email, auth_mode: "PASSWORD" },
        { "x-impersonate-user-id": existingUser.id },
      );

      const { response, next } = await run(middleware, request);

      expect(response.status).toHaveBeenCalledWith(403);
      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({ stepDown: true, reason: "impersonation" }),
      );
      expect(userService.stopImpersonation).toHaveBeenCalledWith(
        adminUser.id,
        existingUser.id,
      );
      expect(
        scopedPermissionService.assertCanImpersonate,
      ).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(next).not.toHaveBeenCalled();
    });

    it("does not write the audit closure in maintenance mode", async () => {
      const { middleware, userService } = buildMiddleware({
        authLevel: authLevelEnforce,
        user: adminUser,
      });
      const request = bearerRequest(
        { email: adminUser.email, auth_mode: "PASSWORD" },
        { "x-impersonate-user-id": existingUser.id },
        { maintenanceMode: true } as Partial<Request>,
      );

      const { response, next } = await run(middleware, request);

      expect(response.status).toHaveBeenCalledWith(403);
      expect(userService.stopImpersonation).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("connexion journal", () => {
    it("warns once a day when a downgrade actually removes rights in mode enforce", async () => {
      const { middleware, logger } = buildMiddleware({
        authLevel: authLevelEnforce,
        user: adminUser,
        logCreated: true,
      });

      await run(
        middleware,
        bearerRequest({ email: adminUser.email, auth_mode: "PASSWORD" }),
      );

      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.log).not.toHaveBeenCalled();
    });

    it("stays silent for the following requests of the day", async () => {
      const { middleware, logger } = buildMiddleware({
        authLevel: authLevelEnforce,
        user: adminUser,
        logCreated: false,
      });

      await run(
        middleware,
        bearerRequest({ email: adminUser.email, auth_mode: "PASSWORD" }),
      );

      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.log).not.toHaveBeenCalled();
    });

    // La population majoritaire (VISITOR sans rien) ne perd rien : pas de bruit.
    it("does not warn when the downgrade removes nothing", async () => {
      const { middleware, logger } = buildMiddleware({
        authLevel: authLevelEnforce,
        user: visitorUser,
        logCreated: true,
      });

      await run(
        middleware,
        bearerRequest({ email: visitorUser.email, auth_mode: "PASSWORD" }),
      );

      expect(logger.warn).not.toHaveBeenCalled();
    });

    it("logs the evaluation once a day in mode observe", async () => {
      const { middleware, logger } = buildMiddleware({
        authLevel: authLevelObserve,
        user: adminUser,
        logCreated: true,
      });

      await run(
        middleware,
        bearerRequest({ email: adminUser.email, auth_mode: "PASSWORD" }),
      );

      expect(logger.log).toHaveBeenCalledTimes(1);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it("logs nothing about levels in mode off", async () => {
      const { middleware, logger } = buildMiddleware({
        user: adminUser,
        logCreated: true,
      });

      await run(middleware, bearerRequest({ email: adminUser.email }));

      expect(logger.log).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });
});
