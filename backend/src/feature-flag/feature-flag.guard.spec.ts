import { ExecutionContext, NotFoundException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { FeatureFlagGuard } from "./feature-flag.guard";
import { FeatureFlagService } from "./feature-flag.service";

function contextMock(): ExecutionContext {
  return {
    getHandler: () => () => undefined,
  } as unknown as ExecutionContext;
}

function buildGuard(metadata: string | undefined, enabled: boolean) {
  const reflector = {
    get: jest.fn().mockReturnValue(metadata),
  } as unknown as Reflector;
  const service = {
    isEnabled: jest.fn().mockResolvedValue(enabled),
  } as unknown as FeatureFlagService;
  return {
    guard: new FeatureFlagGuard(reflector, service),
    isEnabled: service.isEnabled as jest.Mock,
  };
}

describe("FeatureFlagGuard", () => {
  it("laisse passer les endpoints sans métadonnée de flag", async () => {
    const { guard, isEnabled } = buildGuard(undefined, false);
    await expect(guard.canActivate(contextMock())).resolves.toBe(true);
    expect(isEnabled).not.toHaveBeenCalled();
  });

  it("laisse passer quand le flag est activé", async () => {
    const { guard } = buildGuard("fulltext-search", true);
    await expect(guard.canActivate(contextMock())).resolves.toBe(true);
  });

  it("renvoie 404 quand le flag est désactivé", async () => {
    const { guard } = buildGuard("fulltext-search", false);
    await expect(guard.canActivate(contextMock())).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
