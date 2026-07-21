import { ExecutionContext, NotFoundException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { FeatureFlag } from "src/common/decorators/feature-flag.decorator";
import { FeatureFlagGuard } from "./feature-flag.guard";
import { FeatureFlagKey } from "./feature-flag.keys";
import { FeatureFlagService } from "./feature-flag.service";

// Vraies classes décorées : le spec vérifie la lecture réelle des métadonnées
// (niveau classe, niveau méthode, précédence méthode > classe) — pas un mock du
// Reflector qui rendrait le test tautologique.
class UndecoratedController {
  handler(): void {}
}

@FeatureFlag(FeatureFlagKey.MDIT_CAMPAIGNS)
class ClassDecoratedController {
  handler(): void {}
}

class MethodDecoratedController {
  @FeatureFlag(FeatureFlagKey.REPORTS)
  handler(): void {}
}

@FeatureFlag(FeatureFlagKey.MDIT_CAMPAIGNS)
class BothDecoratedController {
  @FeatureFlag(FeatureFlagKey.REPORTS)
  handler(): void {}
}

function contextFor(target: {
  new (): { handler: () => void };
}): ExecutionContext {
  return {
    getHandler: () => target.prototype.handler,
    getClass: () => target,
  } as unknown as ExecutionContext;
}

function buildGuard(enabledKeys: string[]) {
  const isEnabled = jest.fn(async (key: string) => enabledKeys.includes(key));
  const guard = new FeatureFlagGuard(new Reflector(), {
    isEnabled,
  } as unknown as FeatureFlagService);
  return { guard, isEnabled };
}

describe("FeatureFlagGuard", () => {
  it("laisse passer les endpoints sans métadonnée de flag", async () => {
    const { guard, isEnabled } = buildGuard([]);
    await expect(
      guard.canActivate(contextFor(UndecoratedController)),
    ).resolves.toBe(true);
    expect(isEnabled).not.toHaveBeenCalled();
  });

  it("lit la métadonnée posée au niveau CLASSE", async () => {
    const { guard, isEnabled } = buildGuard([FeatureFlagKey.MDIT_CAMPAIGNS]);
    await expect(
      guard.canActivate(contextFor(ClassDecoratedController)),
    ).resolves.toBe(true);
    expect(isEnabled).toHaveBeenCalledWith(FeatureFlagKey.MDIT_CAMPAIGNS);
  });

  it("lit la métadonnée posée au niveau MÉTHODE", async () => {
    const { guard, isEnabled } = buildGuard([FeatureFlagKey.REPORTS]);
    await expect(
      guard.canActivate(contextFor(MethodDecoratedController)),
    ).resolves.toBe(true);
    expect(isEnabled).toHaveBeenCalledWith(FeatureFlagKey.REPORTS);
  });

  it("fait primer la métadonnée de méthode sur celle de classe", async () => {
    const { guard, isEnabled } = buildGuard([FeatureFlagKey.REPORTS]);
    await expect(
      guard.canActivate(contextFor(BothDecoratedController)),
    ).resolves.toBe(true);
    expect(isEnabled).toHaveBeenCalledWith(FeatureFlagKey.REPORTS);
    expect(isEnabled).not.toHaveBeenCalledWith(FeatureFlagKey.MDIT_CAMPAIGNS);
  });

  it("renvoie 404 quand le flag est désactivé", async () => {
    const { guard } = buildGuard([]);
    await expect(
      guard.canActivate(contextFor(ClassDecoratedController)),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
