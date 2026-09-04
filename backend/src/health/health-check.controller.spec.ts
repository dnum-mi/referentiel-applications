import type { ConfigType } from "@nestjs/config";
import type { PrismaService } from "src/prisma/prisma.service";
import appConfig, { type AppConfig } from "src/config/configs/app.config";
import type { MaintenanceService } from "src/maintenance/maintenance.service";
import { HealthCheckController } from "./health-check.controller";

const config: ConfigType<typeof appConfig> = {
  env: "test",
  port: 3500,
  host: "localhost",
  onlyWriteSwagger: false,
  writeYaml: false,
  version: "v1.86.0",
  footerLinks: [],
  maintenanceMode: false,
  maintenanceCacheTtlMs: 30_000,
} satisfies AppConfig;

describe("HealthCheckController", () => {
  it("returns the backend version and maintenance state", async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ "?column?": 1 }]),
    };
    const maintenance = {
      isActive: jest.fn().mockResolvedValue(true),
      isForced: jest.fn().mockReturnValue(false),
    };
    const controller = new HealthCheckController(
      prisma as unknown as PrismaService,
      maintenance as unknown as MaintenanceService,
      config,
    );

    await expect(controller.checkHealth()).resolves.toEqual({
      maintenance: true,
      version: "v1.86.0",
      etat: "OK",
    });
  });

  it("returns a service unavailable response when PostgreSQL fails", async () => {
    const prisma = {
      $queryRaw: jest.fn().mockRejectedValue(new Error("connection refused")),
    };
    const maintenance = {
      isActive: jest.fn(),
      isForced: jest.fn().mockReturnValue(true),
    };
    const controller = new HealthCheckController(
      prisma as unknown as PrismaService,
      maintenance as unknown as MaintenanceService,
      config,
    );

    await expect(controller.checkHealth()).rejects.toMatchObject({
      status: 503,
      response: {
        maintenance: true,
        version: "v1.86.0",
        etat: "KO",
        message: "connection refused",
      },
    });
  });
});
