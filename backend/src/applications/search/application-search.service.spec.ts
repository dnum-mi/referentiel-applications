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
    it("construit une to_tsquery préfixe ciblant le document `simple`", async () => {
      const { service, prisma } = makeService([
        { applicationId: "app-1", rank: 1 },
      ]);

      const result = await service.fullTextSearchPrefix("tow, muel!");

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      // La valeur interpolée dans le tagged template = la tsquery construite.
      expect(prisma.$queryRaw.mock.calls[0][1]).toBe("tow:* & muel:*");
      // L'autocomplétion par préfixe cible le document `simple` (non lemmatisé),
      // sinon la frappe partielle d'un mot ne matche pas le lexème lemmatisé.
      const prefixSql = (
        prisma.$queryRaw.mock.calls[0][0] as unknown as string[]
      ).join("");
      expect(prefixSql).toContain("document_simple");
      expect(prefixSql).toContain("to_tsquery('simple'");
      expect(result).toEqual([{ id: "app-1", rank: 1 }]);
    });

    it.each([
      ["PostgreSQL 15", "PostgreSQL:* & (15:*ABC | 15:D)"],
      ["PostgreSQL 15.5", "PostgreSQL:* & (15.5:*ABC | 15.5:D)"],
      ["PostgreSQL 15.5.2", "PostgreSQL:* & (15.5.2:*ABC | 15.5.2:D)"],
      ["15.5", "(15.5:*ABC | 15.5:D)"],
      [
        "PostgreSQL (15.5), nginx!",
        "PostgreSQL:* & (15.5:*ABC | 15.5:D) & nginx:*",
      ],
    ])(
      "respecte les segments de version tout en conservant les préfixes des autres champs : %s",
      async (query, expectedTsQuery) => {
        const { service, prisma } = makeService();

        await service.fullTextSearchPrefix(query);

        // « 15:* » inclurait la version 150, « 15.5:* » inclurait 15.50.
        // Seules les versions (poids D) imposent une correspondance exacte ;
        // les autres champs conservent leurs préfixes numériques.
        expect(prisma.$queryRaw.mock.calls[0][1]).toBe(expectedTsQuery);
      },
    );

    it("découpe les points des noms de produit sans les confondre avec une version", async () => {
      const { service, prisma } = makeService();

      await service.fullTextSearchPrefix("Node.js 20.11");

      expect(prisma.$queryRaw.mock.calls[0][1]).toBe(
        "Node:* & js:* & (20.11:*ABC | 20.11:D)",
      );
    });

    it("conserve les préfixes numériques des noms d'application", async () => {
      const { service, prisma } = makeService();

      await service.fullTextSearchPrefix("Budget 20");

      expect(prisma.$queryRaw.mock.calls[0][1]).toBe(
        "Budget:* & (20:*ABC | 20:D)",
      );
    });

    it("DÉCOUPE la ponctuation interne au lieu de coller les morceaux (nom trouvable)", async () => {
      // Non-régression : retirer la ponctuation *en concaténant* (« O'Kon » → « OKon »,
      // « QA-GROUP-CHILD » → « QAGROUPCHILD ») produit un lexème absent de l'index,
      // rendant l'application introuvable en tapant son propre nom. Le parseur PG
      // segmente sur la ponctuation → la tsquery doit faire de même.
      const { service, prisma } = makeService([
        { applicationId: "app-1", rank: 1 },
      ]);

      await service.fullTextSearchPrefix("O'Kon");
      await service.fullTextSearchPrefix("QA-GROUP-CHILD");
      await service.fullTextSearchPrefix("Runolfsdottir - O'Kon");

      expect(prisma.$queryRaw.mock.calls[0][1]).toBe("O:* & Kon:*");
      expect(prisma.$queryRaw.mock.calls[1][1]).toBe(
        "QA:* & GROUP:* & CHILD:*",
      );
      expect(prisma.$queryRaw.mock.calls[2][1]).toBe(
        "Runolfsdottir:* & O:* & Kon:*",
      );
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

    it("annule le rafraîchissement en attente à l'arrêt de l'application", async () => {
      const { service, prisma } = makeService();

      service.scheduleRefresh();
      service.onModuleDestroy();
      service.scheduleRefresh();
      service.handlePeriodicRefresh();
      await jest.runAllTimersAsync();

      expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
    });

    it("ne relance pas un rafraîchissement en cours après l'arrêt", async () => {
      const { service, prisma } = makeService();
      let finishRefresh!: () => void;
      const pendingRefresh = new Promise<void>((resolve) => {
        finishRefresh = resolve;
      });
      const refresh = jest
        .spyOn(service, "refreshIndex")
        .mockReturnValueOnce(pendingRefresh);

      service.handlePeriodicRefresh();
      service.handlePeriodicRefresh();
      service.onModuleDestroy();
      finishRefresh();
      await jest.runAllTimersAsync();

      expect(refresh).toHaveBeenCalledTimes(1);
      expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
    });
  });
});
