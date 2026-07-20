import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { FeatureFlagService } from "./feature-flag.service";

function createPrismaMock() {
  return {
    featureFlag: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
}

describe("FeatureFlagService", () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: FeatureFlagService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new FeatureFlagService(prisma as unknown as PrismaService);
  });

  describe("isEnabled (cache)", () => {
    it("met en cache les états et ne recharge pas la base dans le TTL", async () => {
      prisma.featureFlag.findMany.mockResolvedValue([
        { key: "a", enabled: true },
        { key: "b", enabled: false },
      ]);

      expect(await service.isEnabled("a")).toBe(true);
      expect(await service.isEnabled("b")).toBe(false);
      // Clé inconnue → désactivée par défaut.
      expect(await service.isEnabled("unknown")).toBe(false);

      expect(prisma.featureFlag.findMany).toHaveBeenCalledTimes(1);
    });

    it("recharge la base après une invalidation par update", async () => {
      prisma.featureFlag.findMany.mockResolvedValue([
        { key: "a", enabled: false },
      ]);
      expect(await service.isEnabled("a")).toBe(false);

      prisma.featureFlag.findUnique.mockResolvedValue({
        key: "a",
        enabled: false,
      });
      prisma.featureFlag.update.mockResolvedValue({ key: "a", enabled: true });
      await service.update("a", { enabled: true }, "user-1");

      // Le cache a été invalidé : la lecture suivante retape la base.
      prisma.featureFlag.findMany.mockResolvedValue([
        { key: "a", enabled: true },
      ]);
      expect(await service.isEnabled("a")).toBe(true);
      expect(prisma.featureFlag.findMany).toHaveBeenCalledTimes(2);
    });
  });

  describe("update", () => {
    it("persiste l'état et l'auteur de la bascule", async () => {
      prisma.featureFlag.findUnique.mockResolvedValue({
        key: "a",
        enabled: false,
      });
      prisma.featureFlag.update.mockResolvedValue({ key: "a", enabled: true });

      await service.update("a", { enabled: true }, "user-1");

      expect(prisma.featureFlag.update).toHaveBeenCalledWith({
        where: { key: "a" },
        data: { enabled: true, updatedById: "user-1" },
      });
    });

    it("lève NotFound quand le flag n'existe pas", async () => {
      prisma.featureFlag.findUnique.mockResolvedValue(null);

      await expect(
        service.update("missing", { enabled: true }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.featureFlag.update).not.toHaveBeenCalled();
    });
  });
});
