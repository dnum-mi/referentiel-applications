import { Logger } from "@nestjs/common";
import { getMaiaTimeoutMs, maiaConfig } from "./maia.config";

describe("Configuration MAIA", () => {
  const previous = process.env.MAIA_TIMEOUT_MS;
  afterEach(() => {
    if (previous === undefined) delete process.env.MAIA_TIMEOUT_MS;
    else process.env.MAIA_TIMEOUT_MS = previous;
    jest.restoreAllMocks();
  });

  it("limite par défaut les appels à cinq secondes", () => {
    delete process.env.MAIA_TIMEOUT_MS;
    expect(maiaConfig().timeoutMs).toBe(5000);
  });

  it("accepte un délai configuré", () => {
    process.env.MAIA_TIMEOUT_MS = " 1200 ";
    expect(getMaiaTimeoutMs()).toBe(1200);
  });

  it.each(["0", "-1", "Infinity", "60001", "1.5", "20ms"])(
    "conserve une borne valide si la configuration vaut %s",
    (value) => {
      jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
      process.env.MAIA_TIMEOUT_MS = value;
      expect(getMaiaTimeoutMs()).toBe(5000);
    },
  );
});
