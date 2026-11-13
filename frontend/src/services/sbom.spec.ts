// @vitest-environment node
import { client } from "@/client/client.gen";
import { sbomApi, SbomRequestError } from "./sbom";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  client.setConfig({
    baseUrl: "https://refapp.test",
    headers: { "Content-Type": "application/json", Authorization: "Bearer session-test" },
    fetch: fetchMock,
  });
});

describe("client SBOM", () => {
  it("envoie le fichier multipart avec sa source sans écraser la frontière MIME ni l’authentification", async () => {
    fetchMock.mockResolvedValue(Response.json({ id: "analysis-1" }));
    await sbomApi.preview("app-1", {
      file: new File(["{}"], "inventory.json", { type: "application/json" }),
      sourceName: "backend",
      context: "Production",
    });
    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.url).toBe("https://refapp.test/api/v2/applications/app-1/sbom-imports/preview");
    expect(request.headers.get("content-type")).toMatch(/^multipart\/form-data; boundary=/);
    expect(request.headers.get("authorization")).toBe("Bearer session-test");
    const body = await request.formData();
    expect(body.get("sourceName")).toBe("backend");
    expect(body.get("context")).toBe("Production");
    expect(await (body.get("file") as File).text()).toBe("{}");
  });

  it("confirme uniquement l’analyse identifiée et transmet un corps JSON vide", async () => {
    fetchMock.mockResolvedValue(Response.json({ id: "analysis-1", revision: 3, unchanged: false }));
    await sbomApi.commit("app-1", "analysis-1");
    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.url).toBe("https://refapp.test/api/v2/applications/app-1/sbom-imports/analysis-1/commit");
    expect(await request.json()).toEqual({});
  });

  it.each([403, 409, 410, 413, 415])("propage un refus %s comme une erreur avec son statut", async (status) => {
    fetchMock.mockResolvedValue(Response.json({ message: "Refus" }, { status }));
    await expect(sbomApi.commit("app-1", "analysis-1")).rejects.toMatchObject({ name: "SbomRequestError", status });
  });

  it("ne transforme pas un échec réseau en résultat vide", async () => {
    fetchMock.mockRejectedValue(new TypeError("Network unavailable"));
    await expect(sbomApi.sources("app-1")).rejects.toBeInstanceOf(SbomRequestError);
  });

  it("transmet la pagination à l’historique de la source et de l’application demandées", async () => {
    fetchMock.mockResolvedValue(Response.json({ total: 45, results: [] }));
    await sbomApi.sourceImports("app-1", "source-2", { page: 2, pageSize: 20 });
    const request = fetchMock.mock.calls[0][0] as Request;
    const url = new URL(request.url);
    expect(url.pathname).toBe("/api/v2/applications/app-1/sbom-sources/source-2/imports");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("pageSize")).toBe("20");
  });
});
