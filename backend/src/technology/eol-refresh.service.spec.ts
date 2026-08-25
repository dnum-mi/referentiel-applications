const resolveProductReleases = jest.fn();

jest.mock("./utils/endoflife.utils", () => ({
  ...jest.requireActual("./utils/endoflife.utils"),
  resolveProductReleases: (product: string) => resolveProductReleases(product),
}));

import { ConfigService } from "@nestjs/config";
import { PrismaService } from "src/prisma/prisma.service";
import { EolRefreshService } from "./eol-refresh.service";

const releases = [
  { cycle: "13", eol: "2025-11-13", support: "2024-11-14", latest: "13.16" },
];

const makeService = (
  rows: { id: string; product: string; version: string }[],
) => {
  const findMany = jest.fn().mockResolvedValue(rows);
  const update = jest.fn().mockResolvedValue({});
  const prisma = {
    technologyStack: { findMany, update },
  } as unknown as PrismaService;
  const config = {
    get: (key: string, fallback: unknown) =>
      key === "technology.eolBatchSize" ? 2 : fallback,
  } as unknown as ConfigService;
  return { service: new EolRefreshService(prisma, config), findMany, update };
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
    expect(data.eolCheckedAt).toBeInstanceOf(Date);
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
});
