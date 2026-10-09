import { Logger } from "@nestjs/common";
import { getGristTimeoutMs, gristConfig } from "./grist.config";

describe("Configuration Grist", () => {
  const previous = { ...process.env };
  afterEach(() => {
    process.env = { ...previous };
    jest.restoreAllMocks();
  });

  it("vise grist.numerique.gouv.fr et attend 30 s par défaut", () => {
    delete process.env.GRIST_URL;
    delete process.env.GRIST_TIMEOUT_MS;
    expect(gristConfig()).toMatchObject({
      url: "https://grist.numerique.gouv.fr",
      timeoutMs: 30_000,
    });
  });

  it("considère une clé ou un document vide comme absent", () => {
    process.env.GRIST_API_KEY = "  ";
    process.env.GRIST_DOC_ID = "";
    expect(gristConfig()).toMatchObject({
      apiKey: undefined,
      docId: undefined,
    });
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
