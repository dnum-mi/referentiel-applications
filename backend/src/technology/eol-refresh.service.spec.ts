const resolveProductReleases = jest.fn();

jest.mock("./utils/endoflife.utils", () => ({
  ...jest.requireActual("./utils/endoflife.utils"),
  resolveProductReleases: (product: string) => resolveProductReleases(product),
}));

import { ConfigService } from "@nestjs/config";
import { PrismaService } from "src/prisma/prisma.service";
import { EolRefreshService } from "./eol-refresh.service";

// Forme de l'API v1 (cf. EndoflifeRelease) : c'est celle que parseEolInfo lit.
const releases = [
  {
    name: "13",
    eolFrom: "2025-11-13",
    eoasFrom: "2024-11-14",
    latest: { name: "13.16" },
  },
];

const makeService = (
  rows: { id: string; product: string; version: string }[],
  options: { cronEnabled?: boolean; locked?: boolean } = {},
) => {
  const findMany = jest.fn().mockResolvedValue(rows);
  // #2527 : l'écriture est un `updateMany` conditionné à l'origine (`eolSource`).
  const update = jest.fn().mockResolvedValue({ count: 1 });
  const queryRaw = jest
    .fn()
    .mockResolvedValue([{ locked: options.locked ?? true }]);
  const prisma = {
    technologyStack: { findMany, updateMany: update },
    // Le verrou consultatif (#2527) est pris dans une transaction interactive.
    $transaction: (fn: (tx: unknown) => Promise<unknown>) =>
      fn({ $queryRaw: queryRaw }),
  } as unknown as PrismaService;
  const config = {
    get: (key: string, fallback: unknown) => {
      if (key === "technology.eolBatchSize") return 2;
      if (key === "technology.eolCronEnabled") {
        return options.cronEnabled ?? fallback;
      }
      return fallback;
    },
  } as unknown as ConfigService;
  return {
    service: new EolRefreshService(prisma, config),
    findMany,
    update,
    queryRaw,
  };
};

beforeEach(() => {
  resolveProductReleases.mockReset();
  resolveProductReleases.mockResolvedValue({
    status: "resolved",
    slug: "postgresql",
    releases,
  });
});

describe("EolRefreshService", () => {
  it("ne recalcule que les lignes jamais vérifiées ou périmées", async () => {
    const { service, findMany } = makeService([]);
    await service.runRefreshSafely();
    const { where } = findMany.mock.calls[0][0];
    expect(where.OR[0]).toEqual({ eolCheckedAt: null });
    expect(where.OR[1].eolCheckedAt.lt).toBeInstanceOf(Date);
  });

  // #2454 : une date saisie à la main ne vient pas d'endoflife.date ; la recalculer
  // l'écraserait par une résolution vouée à l'échec, ou par celle d'un homonyme.
  it("exclut les saisies manuelles du recalcul", async () => {
    const { service, findMany } = makeService([]);
    await service.runRefreshSafely();
    const { where } = findMany.mock.calls[0][0];
    expect(where.eolSource).toEqual({ not: "manual" });
  });

  /**
   * L'intérêt du lot n'est pas la base mais endoflife.date : cinquante
   * applications déclarant le même produit ne doivent valoir qu'un appel.
   */
  it("ne résout chaque produit qu'une fois, quelle que soit la casse", async () => {
    const { service, update } = makeService([
      { id: "a", product: "PostgreSQL", version: "13" },
      { id: "b", product: "postgresql", version: "13" },
      { id: "c", product: "PostgreSQL", version: "14" },
    ]);
    const result = await service.runRefreshSafely();
    expect(resolveProductReleases).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ stale: 3, updated: 3, products: 1 });
    expect(update).toHaveBeenCalledTimes(3);
  });

  /**
   * Réécrire sur un échec réseau écraserait une date valide par null, et
   * réarmer `eolCheckedAt` figerait la ligne pour tout le TTL alors qu'elle n'a
   * pas été vérifiée.
   */
  it("ne touche pas aux lignes quand endoflife.date ne répond pas", async () => {
    resolveProductReleases.mockResolvedValue({ status: "unavailable" });
    const { service, update } = makeService([
      { id: "a", product: "PostgreSQL", version: "13" },
    ]);
    const result = await service.runRefreshSafely();
    expect(update).not.toHaveBeenCalled();
    expect(result).toMatchObject({ updated: 0, unavailable: 1 });
  });

  it("efface les dates d'un produit non suivi, en gardant la trace de la vérification", async () => {
    resolveProductReleases.mockResolvedValue({ status: "unknown-product" });
    const { service, update } = makeService([
      { id: "a", product: "MaisonMaison", version: "1" },
    ]);
    await service.runRefreshSafely();
    const { data } = update.mock.calls[0][0];
    expect(data.eolProduct).toBeNull();
    expect(data.eolDate).toBeNull();
    expect(data.eolCycle).toBeNull();
    expect(data.eolCheckedAt).toBeInstanceOf(Date);
  });

  it("persiste le cycle apparié avec les dates d'une version reconnue", async () => {
    const { service, update } = makeService([
      { id: "a", product: "PostgreSQL", version: "13.4" },
    ]);
    await service.runRefreshSafely();
    const { data } = update.mock.calls[0][0];
    expect(data).toEqual({
      eolProduct: "postgresql",
      eolDate: new Date("2025-11-13"),
      eoasDate: new Date("2024-11-14"),
      latestVersion: "13.16",
      eolCycle: "13",
      eolCheckedAt: expect.any(Date),
    });
  });

  // #2449 : produit suivi mais version qui ne désigne aucun cycle → dates nulles ET
  // cycle null, pour que la fiche affiche « Version non reconnue » et non « — ».
  it("écrit eolCycle null et des dates nulles quand la version ne désigne aucun cycle", async () => {
    const { service, update } = makeService([
      { id: "a", product: "PostgreSQL", version: "12" },
    ]);
    await service.runRefreshSafely();
    const { data } = update.mock.calls[0][0];
    expect(data).toEqual({
      eolProduct: "postgresql",
      eolDate: null,
      eoasDate: null,
      latestVersion: null,
      eolCycle: null,
      eolCheckedAt: expect.any(Date),
    });
  });

  it("poursuit le run malgré une écriture en échec", async () => {
    const { service, update } = makeService([
      { id: "a", product: "PostgreSQL", version: "13" },
      { id: "b", product: "PostgreSQL", version: "14" },
    ]);
    update.mockRejectedValueOnce(new Error("ligne supprimée entre-temps"));
    const result = await service.runRefreshSafely();
    expect(result).toMatchObject({ stale: 2, updated: 1 });
  });

  // Deux runs concurrents doubleraient les appels sortants sans rien apporter.
  it("ignore un second run lancé pendant le premier", async () => {
    const { service } = makeService([
      { id: "a", product: "PostgreSQL", version: "13" },
    ]);
    let release!: () => void;
    resolveProductReleases.mockReturnValue(
      new Promise((resolve) => {
        release = () =>
          resolve({ status: "resolved", slug: "postgresql", releases });
      }),
    );
    const first = service.runRefreshSafely();
    const second = await service.runRefreshSafely();
    expect(second).toBeNull();
    release();
    await first;
  });

  it("n'exécute rien tant que le cron n'est pas activé", async () => {
    const { service, findMany } = makeService([]);
    await service.handleScheduledRefresh();
    expect(findMany).not.toHaveBeenCalled();
  });

  it("recalcule quand le cron est activé", async () => {
    const { service, findMany } = makeService([], { cronEnabled: true });
    await service.handleScheduledRefresh();
    expect(findMany).toHaveBeenCalledTimes(1);
  });

  // L'interrupteur général doit couper le cron aussi : sinon ENDOFLIFE_ENABLED=false
  // laisserait le recalcul planifié appeler endoflife.date chaque nuit.
  it("n'appelle pas endoflife.date quand ENDOFLIFE_ENABLED=false, même cron activé", async () => {
    const previous = process.env.ENDOFLIFE_ENABLED;
    process.env.ENDOFLIFE_ENABLED = "false";
    try {
      const { service, findMany } = makeService([], { cronEnabled: true });
      await service.handleScheduledRefresh();
      expect(findMany).not.toHaveBeenCalled();
      expect(resolveProductReleases).not.toHaveBeenCalled();
    } finally {
      if (previous === undefined) delete process.env.ENDOFLIFE_ENABLED;
      else process.env.ENDOFLIFE_ENABLED = previous;
    }
  });
});

describe("EolRefreshService — applications supprimées (#2515)", () => {
  it("ne rafraîchit pas les technologies d'une application supprimée", async () => {
    const { service, findMany } = makeService([]);
    await service.runRefreshSafely();
    const { where } = findMany.mock.calls[0][0];
    expect(where.application).toEqual({
      currentStatus: { status: { not: "deleted" } },
    });
  });
});

describe("EolRefreshService — verrou et origine (#2527)", () => {
  it("n'exécute rien quand le verrou consultatif est tenu par une autre instance", async () => {
    const { service, findMany } = makeService([], { locked: false });
    expect(await service.runRefreshSafely()).toBeNull();
    expect(findMany).not.toHaveBeenCalled();
  });

  it("ne réécrit qu'une ligne restée automatique (eolSource endoflife)", async () => {
    const { service, update } = makeService([
      { id: "t-1", product: "PostgreSQL", version: "13" },
    ]);
    await service.runRefreshSafely();
    expect(update.mock.calls[0][0].where).toEqual({
      id: "t-1",
      eolSource: "endoflife",
    });
  });

  it("ne compte pas une ligne devenue manuelle entre la sélection et l'écriture", async () => {
    const { service, update } = makeService([
      { id: "t-1", product: "PostgreSQL", version: "13" },
    ]);
    update.mockResolvedValueOnce({ count: 0 });
    const result = await service.runRefreshSafely();
    expect(result).toMatchObject({ stale: 1, updated: 0 });
  });
});

describe("EolRefreshService — planification (#2526)", () => {
  it("est planifié à 3 h, avant les alertes (3 h 30) et les corrélations (4 h)", () => {
    const options = Reflect.getMetadata(
      "SCHEDULE_CRON_OPTIONS",
      EolRefreshService.prototype.handleScheduledRefresh,
    );
    expect(options).toMatchObject({
      cronTime: "0 3 * * *",
      timeZone: "Europe/Paris",
    });
  });
});
