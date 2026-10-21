import { vi } from "vitest";

const { apiGetConfig } = vi.hoisted(() => ({ apiGetConfig: vi.fn() }));
vi.mock("@/api", () => ({ default: { getConfig: apiGetConfig } }));

it("partage la requête initiale, conserve le cache et permet une relecture autoritaire", async () => {
  vi.resetModules();
  apiGetConfig.mockReset();
  const initial = { betaFeatures: ["catalogue-excel-export"] };
  apiGetConfig.mockResolvedValue({ response: { ok: true }, data: initial });
  const { getConfig } = await import("./config");
  const [first, second] = await Promise.all([getConfig(), getConfig()]);
  expect(first).toEqual(initial);
  expect(second).toEqual(initial);
  expect(apiGetConfig).toHaveBeenCalledTimes(1);
  expect(await getConfig()).toEqual(initial);
  expect(apiGetConfig).toHaveBeenCalledTimes(1);
  apiGetConfig.mockResolvedValueOnce({ response: { ok: true }, data: { betaFeatures: [] } });
  expect(await getConfig({ refresh: true })).toEqual({ betaFeatures: [] });
  expect(apiGetConfig).toHaveBeenCalledTimes(2);
  apiGetConfig.mockResolvedValueOnce({ response: { ok: false }, error: { message: "indisponible" } });
  expect(await getConfig({ refresh: true })).toBeInstanceOf(Error);
  expect(await getConfig()).toBeInstanceOf(Error);
});
