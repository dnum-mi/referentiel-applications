import type { ConfigType } from "@nestjs/config";
import type { PrismaService } from "src/prisma/prisma.service";
import appConfig, { type AppConfig } from "src/config/configs/app.config";
import { MaintenanceService } from "./maintenance.service";

const createConfig = (
  overrides: Partial<AppConfig> = {},
): ConfigType<typeof appConfig> => ({
  env: "test",
  port: 3500,
  host: "localhost",
  onlyWriteSwagger: false,
  writeYaml: false,
  version: "test",
  footerLinks: [],
  nonActorPermissions: [],
  maintenanceMode: false,
  maintenanceCacheTtlMs: 30_000,
  ...overrides,
});

describe("MaintenanceService", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("forces maintenance without querying PostgreSQL", async () => {
    const queryRaw = jest.fn();
    const service = new MaintenanceService(
      { $queryRaw: queryRaw } as unknown as PrismaService,
      createConfig({ maintenanceMode: true }),
    );

    await expect(service.isActive()).resolves.toBe(true);
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it("caches the PostgreSQL recovery state", async () => {
    const queryRaw = jest.fn().mockResolvedValue([{ inRecovery: false }]);
    const service = new MaintenanceService(
      { $queryRaw: queryRaw } as unknown as PrismaService,
      createConfig(),
    );

    await expect(service.isActive()).resolves.toBe(false);
    await expect(service.isActive()).resolves.toBe(false);
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it("refreshes the recovery state after the cache expires", async () => {
    const now = jest.spyOn(Date, "now").mockReturnValue(1_000);
    const queryRaw = jest
      .fn()
      .mockResolvedValueOnce([{ inRecovery: false }])
      .mockResolvedValueOnce([{ inRecovery: true }]);
    const service = new MaintenanceService(
      { $queryRaw: queryRaw } as unknown as PrismaService,
      createConfig(),
    );

    await expect(service.isActive()).resolves.toBe(false);
    now.mockReturnValue(31_001);
    await expect(service.isActive()).resolves.toBe(true);
    expect(queryRaw).toHaveBeenCalledTimes(2);
  });

  it("shares an in-flight PostgreSQL check between concurrent requests", async () => {
    let resolveQuery: ((value: { inRecovery: boolean }[]) => void) | undefined;
    const queryRaw = jest.fn(
      () =>
        new Promise<{ inRecovery: boolean }[]>((resolve) => {
          resolveQuery = resolve;
        }),
    );
    const service = new MaintenanceService(
      { $queryRaw: queryRaw } as unknown as PrismaService,
      createConfig(),
    );

    const firstCheck = service.isActive();
    const secondCheck = service.isActive();
    resolveQuery?.([{ inRecovery: true }]);

    await expect(Promise.all([firstCheck, secondCheck])).resolves.toEqual([
      true,
      true,
    ]);
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });
});
