import { PrismaService } from "src/prisma/prisma.service";
import { ApplicationSearchService } from "./application-search.service";

describe("ApplicationSearchService", () => {
  const makeService = (queryRawResult: unknown[] = []) => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue(queryRawResult),
      $executeRawUnsafe: jest.fn().mockResolvedValue(0),
    };
    const service = new ApplicationSearchService(
      prisma as unknown as PrismaService,
    );
    return { service, prisma };
  };

  describe("fullTextSearch", () => {
    it("retourne une liste vide sans interroger la base pour une requête vide", async () => {
      const { service, prisma } = makeService();
      expect(await service.fullTextSearch("   ")).toEqual([]);
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });

    it("mappe les lignes {applicationId, rank} en {id, rank} et conserve l'ordre", async () => {
      const { service, prisma } = makeService([
        { applicationId: "app-1", rank: 0.9 },
        { applicationId: "app-2", rank: 0.4 },
      ]);

      const result = await service.fullTextSearch("gestion factures");

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      expect(result).toEqual([
        { id: "app-1", rank: 0.9 },
        { id: "app-2", rank: 0.4 },
      ]);
    });
  });

  describe("fullTextSearchPrefix", () => {
    it("construit une to_tsquery préfixe et nettoie la ponctuation", async () => {
      const { service, prisma } = makeService([
        { applicationId: "app-1", rank: 1 },
      ]);

      const result = await service.fullTextSearchPrefix("tow, muel!");

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      // La valeur interpolée dans le tagged template = la tsquery construite.
      expect(prisma.$queryRaw.mock.calls[0][1]).toBe("tow:* & muel:*");
      expect(result).toEqual([{ id: "app-1", rank: 1 }]);
    });

    it("retourne [] sans interroger la base pour une requête vide ou ponctuation seule", async () => {
      const { service, prisma } = makeService();

      expect(await service.fullTextSearchPrefix("   ")).toEqual([]);
      expect(await service.fullTextSearchPrefix("!!! ???")).toEqual([]);
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });
  });

  describe("cache des résultats", () => {
    it("ne réinterroge pas la base pour une même requête répétée", async () => {
      const { service, prisma } = makeService([
        { applicationId: "app-1", rank: 0.9 },
      ]);

      const first = await service.fullTextSearch("gestion");
      const second = await service.fullTextSearch("gestion");

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      expect(second).toEqual(first);
    });

    it("est insensible à la casse de la requête", async () => {
      const { service, prisma } = makeService([
        { applicationId: "app-1", rank: 0.9 },
      ]);

      await service.fullTextSearch("Gestion");
      await service.fullTextSearch("gestion");

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it("est vidé lorsque l'index est rafraîchi", async () => {
      const { service, prisma } = makeService([
        { applicationId: "app-1", rank: 0.9 },
      ]);

      await service.fullTextSearch("gestion");
      await service.refreshIndex();
      await service.fullTextSearch("gestion");

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    });

    it("sépare les entrées préfixe des entrées plein-texte", async () => {
      const { service, prisma } = makeService([
        { applicationId: "app-1", rank: 0.9 },
      ]);

      await service.fullTextSearch("gestion");
      await service.fullTextSearchPrefix("gestion");

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    });
  });

  describe("refreshIndex", () => {
    it("rafraîchit la vue matérialisée en mode CONCURRENTLY", async () => {
      const { service, prisma } = makeService();

      await service.refreshIndex();

      expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
        "REFRESH MATERIALIZED VIEW CONCURRENTLY application_search_index",
      );
    });
  });

  describe("scheduleRefresh", () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it("coalesce plusieurs appels rapprochés en un seul rafraîchissement", async () => {
      const { service, prisma } = makeService();

      service.scheduleRefresh(2000);
      service.scheduleRefresh(2000);
      service.scheduleRefresh(2000);

      expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();

      jest.advanceTimersByTime(2000);
      await Promise.resolve();

      expect(prisma.$executeRawUnsafe).toHaveBeenCalledTimes(1);
    });
  });
});
