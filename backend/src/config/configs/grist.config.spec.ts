import { Logger } from "@nestjs/common";
import { getGristTimeoutMs, gristConfig } from "./grist.config";

describe("Configuration Grist", () => {
  const previous = { ...process.env };
  afterEach(() => {
    process.env = { ...previous };
    jest.restoreAllMocks();
  });

  it("attend 30 s par défaut", () => {
    delete process.env.GRIST_TIMEOUT_MS;
    expect(gristConfig()).toEqual({ timeoutMs: 30_000 });
  });

  it.each(["0", "-1", "300001", "1.5", "20ms"])(
    "conserve le délai par défaut si la configuration vaut %s",
    (value) => {
      jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
      process.env.GRIST_TIMEOUT_MS = value;
      expect(getGristTimeoutMs()).toBe(30_000);
    },
  );
});
