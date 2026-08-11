import type { ConfigType } from "@nestjs/config";
import type { NextFunction, Request, Response } from "express";
import { Roles, UserType } from "@prisma/client";
import type { LoggerService } from "src/logger/logger.service";
import type { MaintenanceService } from "src/maintenance/maintenance.service";
import type { TokenService } from "src/token/token.service";
import type { UserConnexionLogService } from "src/user/user-connexion-log.service";
import type { UserService } from "src/user/user.service";
import type { OidcConfig } from "src/config/configs/oidc.config";
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

const oidcConfig = {
  jwksUrl: "https://example.test/.well-known/jwks.json",
  configUrl: "https://example.test/.well-known/openid-configuration",
  clientId: "refapp",
} as ConfigType<() => OidcConfig>;

const existingUser = {
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

describe("AuthMiddleware maintenance mode", () => {
  const previousDisableJwtValidation = process.env.DISABLE_JWT_VALIDATION;

  beforeAll(() => {
    process.env.DISABLE_JWT_VALIDATION = "true";
  });

  afterAll(() => {
    process.env.DISABLE_JWT_VALIDATION = previousDisableJwtValidation;
  });

  it("authenticates an existing user without creating or logging it", async () => {
    const userService = {
      findByEmailWithRelations: jest.fn().mockResolvedValue(existingUser),
      findOrCreateByEmail: jest.fn(),
    };
    const tokenService = { findUserByToken: jest.fn() };
    const userConnexionLogService = { log: jest.fn() };
    const maintenanceService = { isActive: jest.fn() };
    const logger = { error: jest.fn() };
    const middleware = new AuthMiddleware(
      oidcConfig,
      userService as unknown as UserService,
      tokenService as unknown as TokenService,
      userConnexionLogService as unknown as UserConnexionLogService,
      logger as unknown as LoggerService,
      maintenanceService as unknown as MaintenanceService,
    );
    const payload = Buffer.from(
      JSON.stringify({ email: existingUser.email }),
    ).toString("base64url");
    const request = {
      maintenanceMode: true,
      headers: {
        authorization: `Bearer eyJhbGciOiJub25lIn0.${payload}.signature`,
      },
    } as Request;
    const response = {
      status: jest.fn(),
      json: jest.fn(),
    } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await middleware.use(request, response, next);

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
    const userService = {
      findByEmailWithRelations: jest.fn(),
      findOrCreateByEmail: jest.fn(),
    };
    const tokenService = {
      findUserByToken: jest.fn().mockResolvedValue(existingUser),
    };
    const userConnexionLogService = { log: jest.fn() };
    const middleware = new AuthMiddleware(
      oidcConfig,
      userService as unknown as UserService,
      tokenService as unknown as TokenService,
      userConnexionLogService as unknown as UserConnexionLogService,
      { error: jest.fn() } as unknown as LoggerService,
      { isActive: jest.fn() } as unknown as MaintenanceService,
    );
    const request = {
      maintenanceMode: true,
      headers: { "x-refapp-token": "api-key" },
    } as unknown as Request;

    await middleware.use(
      request,
      { status: jest.fn(), json: jest.fn() } as unknown as Response,
      jest.fn(),
    );

    expect(tokenService.findUserByToken).toHaveBeenCalledWith("api-key", {
      readOnly: true,
    });
    expect(userConnexionLogService.log).not.toHaveBeenCalled();
  });
});

describe("AuthMiddleware blocked user", () => {
  const previousDisableJwtValidation = process.env.DISABLE_JWT_VALIDATION;

  beforeAll(() => {
    process.env.DISABLE_JWT_VALIDATION = "true";
  });

  afterAll(() => {
    process.env.DISABLE_JWT_VALIDATION = previousDisableJwtValidation;
  });

  it("rejects a blocked user with a 403 instead of setting req.user", async () => {
    const blockedUser = { ...existingUser, isBlocked: true };
    const userService = {
      findByEmailWithRelations: jest.fn(),
      findOrCreateByEmail: jest.fn().mockResolvedValue(blockedUser),
    };
    const tokenService = { findUserByToken: jest.fn() };
    const userConnexionLogService = { log: jest.fn() };
    const maintenanceService = { isActive: jest.fn().mockResolvedValue(false) };
    const middleware = new AuthMiddleware(
      oidcConfig,
      userService as unknown as UserService,
      tokenService as unknown as TokenService,
      userConnexionLogService as unknown as UserConnexionLogService,
      { error: jest.fn() } as unknown as LoggerService,
      maintenanceService as unknown as MaintenanceService,
    );
    const payload = Buffer.from(
      JSON.stringify({ email: blockedUser.email }),
    ).toString("base64url");
    const request = {
      headers: {
        authorization: `Bearer eyJhbGciOiJub25lIn0.${payload}.signature`,
      },
    } as Request;
    const response = {
      status: jest.fn(),
      json: jest.fn(),
    } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await middleware.use(request, response, next);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ blocked: true }),
    );
    expect(request.user).toBeUndefined();
    expect(next).not.toHaveBeenCalled();
    expect(userConnexionLogService.log).not.toHaveBeenCalled();
  });
});
