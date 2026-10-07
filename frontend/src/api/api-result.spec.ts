// @vitest-environment node
import { createClient } from "@/client/client";
import { isApiSuccess } from "./api-result";

describe("isApiSuccess — contrat du client généré", () => {
  it("accepte une réponse HTTP décodée sans erreur", async () => {
    const client = createClient({
      baseUrl: "https://refapp.test",
      fetch: vi.fn<typeof fetch>().mockResolvedValue(Response.json({ value: "ok" })),
    });

    const result = await client.get({ url: "/status" });

    expect(isApiSuccess(result)).toBe(true);
    expect(result.data).toEqual({ value: "ok" });
  });

  it("refuse un échec réseau sans réponse HTTP", async () => {
    const error = new TypeError("Failed to fetch");
    const client = createClient({
      baseUrl: "https://refapp.test",
      fetch: vi.fn<typeof fetch>().mockRejectedValue(error),
    });

    const result = await client.get({ url: "/status" });

    expect(result.response).toBeUndefined();
    expect(result.error).toBe(error);
    expect(isApiSuccess(result)).toBe(false);
  });

  it("refuse une erreur de décodage même après un HTTP 200", async () => {
    const client = createClient({
      baseUrl: "https://refapp.test",
      fetch: vi.fn<typeof fetch>().mockResolvedValue(new Response("invalide", { headers: { "Content-Type": "application/json" } })),
    });

    const result = await client.get({ url: "/status" });

    expect(result.response?.ok).toBe(true);
    expect(result.error).toBeInstanceOf(SyntaxError);
    expect(isApiSuccess(result)).toBe(false);
  });

  it("refuse une erreur HTTP", async () => {
    const client = createClient({
      baseUrl: "https://refapp.test",
      fetch: vi.fn<typeof fetch>().mockResolvedValue(Response.json({ message: "Forbidden" }, { status: 403 })),
    });

    const result = await client.get({ url: "/status" });

    expect(result.response?.status).toBe(403);
    expect(isApiSuccess(result)).toBe(false);
  });
});
