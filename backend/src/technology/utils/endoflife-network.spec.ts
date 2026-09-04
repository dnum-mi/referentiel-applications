import { fetch } from "undici";
import {
  clearProductCatalogCache,
  isEndoflifeOutageMemoized,
  resolveProductReleases,
} from "./endoflife.utils";

jest.mock("undici", () => ({ fetch: jest.fn() }));
jest.mock("src/common/http/outbound-dispatcher", () => ({
  createWarnThrottle: () => () => true,
  describeFetchError: (error: unknown) => String(error),
  getOutboundDispatcher: () => undefined,
}));

const fetchMock = fetch as unknown as jest.Mock;

const ok = (body: unknown) => ({
  ok: true,
  status: 200,
  body: null,
  json: async () => body,
});
const httpStatus = (status: number) => ({
  ok: status < 400,
  status,
  body: { cancel: async () => undefined },
  json: async () => ({}),
});
const catalog = ok({ result: [{ name: "postgresql", label: "PostgreSQL" }] });
const releases = ok({
  result: { releases: [{ name: "15", eolFrom: "2027-11-11" }] },
});

describe("endoflife.utils — couche réseau", () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date("2026-09-04T10:00:00Z") });
    clearProductCatalogCache();
    fetchMock.mockReset();
  });
  afterEach(() => jest.useRealTimers());

  describe("disjoncteur (#2513)", () => {
    it("après un échec réseau, plus aucune requête pendant une minute : catalogue ET produit ne coûtent qu'UN appel", async () => {
      fetchMock.mockRejectedValue(new Error("ETIMEDOUT"));

      expect(await resolveProductReleases("PostgreSQL")).toEqual({
        status: "unavailable",
      });
      // Le catalogue a échoué ; la requête produit a été court-circuitée.
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(isEndoflifeOutageMemoized()).toBe(true);

      expect(await resolveProductReleases("MySQL")).toEqual({
        status: "unavailable",
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("un 5xx et un 404 sur le catalogue ouvrent aussi le disjoncteur", async () => {
      fetchMock.mockResolvedValueOnce(httpStatus(503));
      await resolveProductReleases("PostgreSQL");
      expect(isEndoflifeOutageMemoized()).toBe(true);

      clearProductCatalogCache();
      fetchMock.mockResolvedValueOnce(httpStatus(404));
      await resolveProductReleases("PostgreSQL");
      expect(isEndoflifeOutageMemoized()).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("se referme après une minute et une réponse réussie", async () => {
      fetchMock.mockRejectedValueOnce(new Error("ECONNRESET"));
      await resolveProductReleases("PostgreSQL");
      expect(isEndoflifeOutageMemoized()).toBe(true);

      jest.setSystemTime(new Date("2026-09-04T10:01:01Z"));
      fetchMock.mockResolvedValueOnce(catalog).mockResolvedValueOnce(releases);
      expect(await resolveProductReleases("PostgreSQL")).toMatchObject({
        status: "resolved",
        slug: "postgresql",
      });
      expect(isEndoflifeOutageMemoized()).toBe(false);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it("un 404 produit (cas nominal avec catalogue) n'ouvre pas le disjoncteur", async () => {
      fetchMock
        .mockResolvedValueOnce(catalog)
        .mockResolvedValueOnce(httpStatus(404));
      // « pgsql » n'est pas dans le catalogue → unknown-product sans appel produit ;
      // on force un produit du catalogue dont l'API répondrait 404.
      expect(await resolveProductReleases("PostgreSQL")).toEqual({
        status: "unknown-product",
      });
      expect(isEndoflifeOutageMemoized()).toBe(false);
    });
  });

  describe("mode dégradé sans catalogue (#2514)", () => {
    // Un catalogue en 200 mais sans `result` (proxy qui répond une page à la place de
    // l'API) laisse le cache vide SANS ouvrir le disjoncteur : c'est le seul chemin
    // par lequel la résolution tente encore un slug deviné.
    const emptyCatalog = ok({ unexpected: true });

    it("un 404 sur un slug deviné vaut « unavailable », jamais « produit non suivi »", async () => {
      fetchMock
        .mockResolvedValueOnce(emptyCatalog)
        .mockResolvedValueOnce(httpStatus(404));
      expect(await resolveProductReleases("Spring Boot")).toEqual({
        status: "unavailable",
      });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("un échec réseau sur le produit vaut « unavailable »", async () => {
      fetchMock
        .mockResolvedValueOnce(emptyCatalog)
        .mockRejectedValueOnce(new Error("ETIMEDOUT"));
      expect(await resolveProductReleases("PostgreSQL")).toEqual({
        status: "unavailable",
      });
    });

    it("une résolution positive sur un slug deviné reste acceptée", async () => {
      fetchMock
        .mockResolvedValueOnce(emptyCatalog)
        .mockResolvedValueOnce(releases);
      expect(await resolveProductReleases("PostgreSQL")).toMatchObject({
        status: "resolved",
        slug: "postgresql",
      });
    });

    it("avec un catalogue, un produit absent reste « produit non suivi » (persisté)", async () => {
      fetchMock.mockResolvedValueOnce(catalog);
      expect(await resolveProductReleases("Outil maison")).toEqual({
        status: "unknown-product",
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
