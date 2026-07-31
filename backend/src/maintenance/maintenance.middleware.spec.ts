import type { NextFunction, Request, Response } from "express";
import { HttpStatus } from "@nestjs/common";
import { MAINTENANCE_MESSAGE } from "./maintenance.constants";
import { MaintenanceMiddleware } from "./maintenance.middleware";
import type { MaintenanceService } from "./maintenance.service";

function createResponse() {
  const response = {
    setHeader: jest.fn(),
    status: jest.fn(),
    json: jest.fn(),
  };
  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);
  return response;
}

describe("MaintenanceMiddleware", () => {
  it("allows read requests and exposes the maintenance state", async () => {
    const maintenanceService = {
      isActive: jest.fn().mockResolvedValue(true),
    };
    const middleware = new MaintenanceMiddleware(
      maintenanceService as unknown as MaintenanceService,
    );
    const request = { method: "GET" } as Request;
    const response = createResponse();
    const next = jest.fn() as NextFunction;

    await middleware.use(request, response as unknown as Response, next);

    expect(request.maintenanceMode).toBe(true);
    expect(next).toHaveBeenCalledTimes(1);
    expect(response.status).not.toHaveBeenCalled();
  });

  it("blocks write requests while maintenance is active", async () => {
    const maintenanceService = {
      isActive: jest.fn().mockResolvedValue(true),
    };
    const middleware = new MaintenanceMiddleware(
      maintenanceService as unknown as MaintenanceService,
    );
    const request = { method: "PATCH" } as Request;
    const response = createResponse();
    const next = jest.fn() as NextFunction;

    await middleware.use(request, response as unknown as Response, next);

    expect(response.setHeader).toHaveBeenCalledWith("Retry-After", "30");
    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.SERVICE_UNAVAILABLE,
    );
    expect(response.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      maintenance: true,
      message: MAINTENANCE_MESSAGE,
      error: "Service Unavailable",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("forwards detection failures to the exception layer", async () => {
    const error = new Error("database unavailable");
    const maintenanceService = {
      isActive: jest.fn().mockRejectedValue(error),
    };
    const middleware = new MaintenanceMiddleware(
      maintenanceService as unknown as MaintenanceService,
    );
    const response = createResponse();
    const next = jest.fn() as NextFunction;

    await middleware.use(
      { method: "GET" } as Request,
      response as unknown as Response,
      next,
    );

    expect(next).toHaveBeenCalledWith(error);
  });
});
