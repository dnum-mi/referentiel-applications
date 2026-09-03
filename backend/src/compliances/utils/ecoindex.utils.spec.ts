import { BadRequestException, Logger } from "@nestjs/common";
import { fetch } from "undici";
import { getOutboundDispatcher } from "src/common/http/outbound-dispatcher";
import { calculateEcoIndexMetricsFromUrl } from "./ecoindex.utils";

jest.mock("undici", () => ({
  ...jest.requireActual("undici"),
  fetch: jest.fn(),
}));
jest.mock("src/common/http/outbound-dispatcher", () => ({
  ...jest.requireActual("src/common/http/outbound-dispatcher"),
  getOutboundDispatcher: jest.fn(),
}));

const fetchMock = fetch as jest.MockedFunction<typeof fetch>;
const dispatcherMock = getOutboundDispatcher as jest.MockedFunction<
  typeof getOutboundDispatcher
>;
type FetchResponse = Awaited<ReturnType<typeof fetch>>;

/// Sentinelle : aucun réseau, on vérifie seulement que le dispatcher commun est transmis.
const DISPATCHER = { sentinel: true } as unknown as ReturnType<
  typeof getOutboundDispatcher
>;
// IP publique littérale : la garde SSRF passe sans résolution DNS. La query string
// simule un paramètre sensible qui ne doit pas apparaître dans les logs.
const TARGET = "https://8.8.8.8/page?token=s3cret";

describe("EcoIndex — appel sortant via le dispatcher commun (#2447)", () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchMock.mockReset();
    dispatcherMock.mockReset().mockReturnValue(DISPATCHER);
    warnSpy = jest
      .spyOn(Logger.prototype, "warn")
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("passe par le fetch d'undici avec le dispatcher commun, sans suivre les redirections", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "<html><body><p>Bonjour</p></body></html>",
    } as unknown as FetchResponse);

    const result = await calculateEcoIndexMetricsFromUrl(TARGET);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(TARGET);
    expect(init).toMatchObject({ dispatcher: DISPATCHER, redirect: "error" });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(result.score).toBeGreaterThan(0);
    expect(result.calculatedAt).toBeInstanceOf(Date);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("relance l'erreur réseau telle quelle et la trace avec l'hôte seul", async () => {
    const error = Object.assign(new TypeError("fetch failed"), {
      cause: Object.assign(new Error("connect ECONNREFUSED 10.0.0.1:3128"), {
        code: "ECONNREFUSED",
      }),
    });
    fetchMock.mockRejectedValue(error);

    await expect(calculateEcoIndexMetricsFromUrl(TARGET)).rejects.toBe(error);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const [line] = warnSpy.mock.calls[0];
    expect(line).toContain("8.8.8.8");
    expect(line).toContain("erreur réseau ECONNREFUSED");
    expect(line).not.toContain("token=s3cret");
    expect(line).toMatch(/\(\d+ ms\)/);
  });

  it("signale un statut HTTP non 2xx comme avant, corps libéré", async () => {
    const cancel = jest.fn().mockResolvedValue(undefined);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      body: { cancel },
    } as unknown as FetchResponse);

    await expect(calculateEcoIndexMetricsFromUrl(TARGET)).rejects.toThrow(
      "EcoIndex target responded with status 503",
    );

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain("statut HTTP 503");
  });

  it("n'appelle rien quand la garde SSRF rejette la cible, mais le trace", async () => {
    await expect(
      calculateEcoIndexMetricsFromUrl("http://127.0.0.1/"),
    ).rejects.toThrow(BadRequestException);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(dispatcherMock).not.toHaveBeenCalled();
    // Le rejet est tracé sous « EcoIndex », sinon l'exploitant ne verrait qu'un 400
    // et chercherait une panne réseau qui n'a pas eu lieu.
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain("refusé avant tout appel");
    expect(warnSpy.mock.calls[0][0]).toContain("adresse interne");
  });
});
