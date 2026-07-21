import { NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { FEATURE_FLAG_CATALOG } from "./feature-flag.keys";
import { FeatureFlagPubSub } from "./feature-flag.pubsub";
import { FeatureFlagService } from "./feature-flag.service";

function createPrismaMock() {
  return {
    featureFlag: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
}

function createPubSubMock() {
  return {
    subscribe: jest.fn(),
    publishInvalidation: jest.fn().mockResolvedValue(undefined),
  };
}

function p2025(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("No record found", {
    code: "P2025",
    clientVersion: "test",
  });
}

describe("FeatureFlagService", () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let pubSub: ReturnType<typeof createPubSubMock>;
  let service: FeatureFlagService;

  beforeEach(() => {
    // Le TTL est lu de l'env à la construction (0 en e2e via jest.setup) : on
    // le fixe ici à sa valeur nominale pour tester le comportement du cache.
    process.env.FEATURE_FLAG_CACHE_TTL_MS = "10000";
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    prisma = createPrismaMock();
    pubSub = createPubSubMock();
    service = new FeatureFlagService(
      prisma as unknown as PrismaService,
      pubSub as unknown as FeatureFlagPubSub,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    delete process.env.FEATURE_FLAG_CACHE_TTL_MS;
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

    it("sert le cache juste avant l'expiration et recharge juste après le TTL", async () => {
      prisma.featureFlag.findMany.mockResolvedValue([
        { key: "a", enabled: false },
      ]);
      await service.isEnabled("a");

      jest.advanceTimersByTime(9_999);
      await service.isEnabled("a");
      expect(prisma.featureFlag.findMany).toHaveBeenCalledTimes(1);

      prisma.featureFlag.findMany.mockResolvedValue([
        { key: "a", enabled: true },
      ]);
      jest.advanceTimersByTime(2);
      expect(await service.isEnabled("a")).toBe(true);
      expect(prisma.featureFlag.findMany).toHaveBeenCalledTimes(2);
    });

    it("recharge la base après une invalidation par update", async () => {
      prisma.featureFlag.findMany.mockResolvedValue([
        { key: "a", enabled: false },
      ]);
      expect(await service.isEnabled("a")).toBe(false);

      prisma.featureFlag.update.mockResolvedValue({ key: "a", enabled: true });
      await service.update("a", { enabled: true }, "user-1");

      // Le cache a été invalidé : la lecture suivante retape la base.
      prisma.featureFlag.findMany.mockResolvedValue([
        { key: "a", enabled: true },
      ]);
      expect(await service.isEnabled("a")).toBe(true);
      expect(prisma.featureFlag.findMany).toHaveBeenCalledTimes(2);
    });

    it("n'installe pas un rechargement parti avant une bascule (anti-race)", async () => {
      // findMany « lent » : parti AVANT la bascule, il porte des données périmées.
      let resolveStale!: (v: { key: string; enabled: boolean }[]) => void;
      prisma.featureFlag.findMany.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveStale = resolve;
        }),
      );
      const inflight = service.isEnabled("a");

      prisma.featureFlag.update.mockResolvedValue({ key: "a", enabled: true });
      await service.update("a", { enabled: true });

      resolveStale([{ key: "a", enabled: false }]);
      await inflight;

      // Le résultat périmé n'a pas été installé : la lecture suivante recharge
      // et voit l'état post-bascule.
      prisma.featureFlag.findMany.mockResolvedValue([
        { key: "a", enabled: true },
      ]);
      expect(await service.isEnabled("a")).toBe(true);
    });

    it("sert l'état stale (ou désactivé si jamais chargé) quand la base est en panne", async () => {
      // Jamais chargé + panne → fail-closed, sans lever.
      prisma.featureFlag.findMany.mockRejectedValueOnce(new Error("db down"));
      expect(await service.isEnabled("a")).toBe(false);

      // État chargé, puis panne au rafraîchissement → on sert le dernier connu.
      prisma.featureFlag.findMany.mockResolvedValueOnce([
        { key: "a", enabled: true },
      ]);
      jest.advanceTimersByTime(10_001);
      expect(await service.isEnabled("a")).toBe(true);

      prisma.featureFlag.findMany.mockRejectedValueOnce(new Error("db down"));
      jest.advanceTimersByTime(10_001);
      expect(await service.isEnabled("a")).toBe(true);
    });
  });

  describe("getEnabledMap", () => {
    it("n'expose que les flags activés (les clés désactivées ne fuient pas)", async () => {
      prisma.featureFlag.findMany.mockResolvedValue([
        { key: "on", enabled: true },
        { key: "off", enabled: false },
      ]);

      await expect(service.getEnabledMap()).resolves.toEqual({ on: true });
    });
  });

  describe("update", () => {
    it("persiste l'état et l'auteur de la bascule en une seule requête", async () => {
      prisma.featureFlag.update.mockResolvedValue({ key: "a", enabled: true });

      await service.update("a", { enabled: true }, "user-1");

      expect(prisma.featureFlag.update).toHaveBeenCalledWith({
        where: { key: "a" },
        data: { enabled: true, updatedById: "user-1" },
        select: {
          key: true,
          label: true,
          description: true,
          enabled: true,
          updatedAt: true,
        },
      });
    });

    it("lève NotFound quand le flag n'existe pas (P2025)", async () => {
      prisma.featureFlag.update.mockRejectedValue(p2025());

      await expect(
        service.update("missing", { enabled: true }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("diffuse l'invalidation aux autres instances (NOTIFY)", async () => {
      prisma.featureFlag.update.mockResolvedValue({ key: "a", enabled: true });

      await service.update("a", { enabled: true }, "user-1");

      expect(pubSub.publishInvalidation).toHaveBeenCalledWith("a");
    });
  });

  describe("propagation inter-instances", () => {
    it("invalide le cache local quand une bascule distante est reçue", async () => {
      // onModuleInit abonne le cache au canal.
      prisma.featureFlag.findMany.mockResolvedValue([]);
      await service.onModuleInit();
      const [remoteInvalidation] = pubSub.subscribe.mock.calls[0] as [
        () => void,
      ];

      prisma.featureFlag.findMany.mockResolvedValue([
        { key: "a", enabled: false },
      ]);
      expect(await service.isEnabled("a")).toBe(false);

      // Une autre instance bascule le flag : notification reçue.
      remoteInvalidation();

      prisma.featureFlag.findMany.mockResolvedValue([
        { key: "a", enabled: true },
      ]);
      expect(await service.isEnabled("a")).toBe(true);
    });
  });

  describe("onModuleInit (sync du catalogue)", () => {
    it("crée les flags manquants et réaligne les métadonnées des existants", async () => {
      prisma.featureFlag.findMany.mockResolvedValue([
        { key: "fulltext-search", updatedById: null },
      ]);
      prisma.featureFlag.create.mockResolvedValue({});
      prisma.featureFlag.update.mockResolvedValue({});

      await service.onModuleInit();

      // Le flag déjà en base est mis à jour (label/description), jamais son état.
      const updates = prisma.featureFlag.update.mock.calls.map(
        ([args]: [{ where: { key: string }; data: Record<string, unknown> }]) =>
          args,
      );
      const fulltext = updates.find((u) => u.where.key === "fulltext-search");
      expect(fulltext).toBeDefined();
      expect(fulltext?.data).not.toHaveProperty("enabled");
      // Tous les autres flags du catalogue sont créés.
      expect(prisma.featureFlag.create).toHaveBeenCalledTimes(
        FEATURE_FLAG_CATALOG.length - 1,
      );
    });

    it("supprime les flags retirés du catalogue (orphelins)", async () => {
      prisma.featureFlag.findMany.mockResolvedValue([
        { key: "flag-retire-du-code", updatedById: null },
      ]);
      prisma.featureFlag.create.mockResolvedValue({});
      prisma.featureFlag.deleteMany.mockResolvedValue({});

      await service.onModuleInit();

      expect(prisma.featureFlag.deleteMany).toHaveBeenCalledWith({
        where: {
          key: { notIn: FEATURE_FLAG_CATALOG.map((def) => def.key) },
        },
      });
    });

    it("n'empêche pas le boot si la synchronisation échoue", async () => {
      prisma.featureFlag.findMany.mockRejectedValue(new Error("db down"));
      await expect(service.onModuleInit()).resolves.toBeUndefined();
    });
  });
});
