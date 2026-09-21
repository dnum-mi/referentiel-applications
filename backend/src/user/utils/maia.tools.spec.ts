import { createServer, type RequestListener, type Server } from "node:http";
import { MaiaUnavailableException } from "../errors/maia-unavailable.exception";
import { getFullNameFromMaia, getOrganizationPathFromMaia } from "./maia.tools";

describe("MAIA — requêtes bornées et erreurs explicites", () => {
  const previousEnv = { ...process.env };
  let server: Server;

  beforeEach(() => {
    process.env.MOCK_MAIA_SERVICE = "false";
    process.env.MAIA_API_URL = "http://maia.test/find";
    process.env.MAIA_TIMEOUT_MS = "1000";
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    process.env = { ...previousEnv };
    if (server) {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
      server = undefined;
    }
  });

  async function serve(handler: RequestListener) {
    server = createServer(handler);
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Port absent");
    process.env.MAIA_API_URL = `http://127.0.0.1:${address.port}/find`;
  }

  it("conserve les informations d'une réponse MAIA valide", async () => {
    jest.spyOn(global, "fetch").mockImplementation(async () =>
      Response.json({
        data: [
          {
            values: {
              structure: { values: { fullCode: "  DIRECTION/SERVICE  " } },
              firstName: "Jean",
              lastName: "DUPONT",
              fullName: "Jean DUPONT",
            },
          },
        ],
      }),
    );
    await expect(
      getOrganizationPathFromMaia("person@example.com"),
    ).resolves.toBe("DIRECTION/SERVICE");
    await expect(getFullNameFromMaia("person@example.com")).resolves.toEqual({
      firstName: "Jean",
      lastName: "DUPONT",
      fullName: "Jean DUPONT",
    });
  });

  it("distingue une personne absente d'une panne", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(Response.json({ data: [] }));
    await expect(
      getOrganizationPathFromMaia("person@example.com"),
    ).resolves.toBeNull();
  });

  it("accepte les champs MAIA absents ou nuls", async () => {
    jest.spyOn(global, "fetch").mockImplementation(async () =>
      Response.json({
        data: [{ values: { structure: null, firstName: null } }],
      }),
    );
    await expect(
      getOrganizationPathFromMaia("person@example.com"),
    ).resolves.toBeNull();
    await expect(getFullNameFromMaia("person@example.com")).resolves.toEqual({
      lastName: "",
      firstName: "",
      fullName: "",
    });
  });

  it("convertit une panne réseau en erreur MAIA 503", async () => {
    jest
      .spyOn(global, "fetch")
      .mockRejectedValue(new TypeError("fetch failed"));
    await expect(
      getOrganizationPathFromMaia("person@example.com"),
    ).rejects.toMatchObject({
      reason: "network",
      status: 503,
    });
  });

  it("contrôle HTTP avant de décoder un corps HTML en erreur", async () => {
    const response = new Response("<html>indisponible</html>", { status: 500 });
    const json = jest.spyOn(response, "json");
    jest.spyOn(global, "fetch").mockResolvedValue(response);
    await expect(
      getOrganizationPathFromMaia("person@example.com"),
    ).rejects.toMatchObject({
      reason: "http",
      upstreamStatus: 500,
      status: 503,
    });
    expect(json).not.toHaveBeenCalled();
  });

  it("convertit une réponse 200 HTML en erreur explicite", async () => {
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response("<html>erreur</html>"));
    await expect(
      getFullNameFromMaia("person@example.com"),
    ).rejects.toMatchObject({
      reason: "response",
      status: 503,
    });
  });

  it.each([
    null,
    [],
    { data: "invalide" },
    { data: [{ values: { firstName: 42 } }] },
  ])("refuse une réponse JSON de structure invalide : %p", async (payload) => {
    jest.spyOn(global, "fetch").mockResolvedValue(Response.json(payload));
    await expect(
      getOrganizationPathFromMaia("person@example.com"),
    ).rejects.toBeInstanceOf(MaiaUnavailableException);
  });

  it("borne une vraie requête lorsque le serveur ne répond pas", async () => {
    await serve((_request, _response) => undefined);
    process.env.MAIA_TIMEOUT_MS = "40";
    const started = Date.now();
    await expect(
      getOrganizationPathFromMaia("person@example.com"),
    ).rejects.toMatchObject({ reason: "timeout" });
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it("borne également la lecture d'un corps qui reste ouvert", async () => {
    await serve((_request, response) => {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.write('{"data":[');
    });
    process.env.MAIA_TIMEOUT_MS = "100";
    await expect(
      getOrganizationPathFromMaia("person@example.com"),
    ).rejects.toMatchObject({ reason: "timeout" });
  });

  it("signale une URL absente sans lancer de requête", async () => {
    delete process.env.MAIA_API_URL;
    const fetch = jest.spyOn(global, "fetch");
    await expect(
      getOrganizationPathFromMaia("person@example.com"),
    ).rejects.toMatchObject({ reason: "configuration" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("préserve le mode bouchonné sans accès réseau", async () => {
    process.env.MOCK_MAIA_SERVICE = "true";
    process.env.MOCK_MAIA_ORGANIZATION = "ORG/MOCK";
    const fetch = jest.spyOn(global, "fetch");
    await expect(
      getOrganizationPathFromMaia("person@example.com"),
    ).resolves.toBe("ORG/MOCK");
    expect(fetch).not.toHaveBeenCalled();
  });
});
