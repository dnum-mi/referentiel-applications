import { ServiceUnavailableException } from "@nestjs/common";
import { decryptGristApiKey, encryptGristApiKey } from "./grist-api-key";

describe("Chiffrement de la clé d'API Grist", () => {
  const previous = process.env.GRIST_ENCRYPTION_KEY;
  beforeEach(() => (process.env.GRIST_ENCRYPTION_KEY = "secret-de-test"));
  afterAll(() => (process.env.GRIST_ENCRYPTION_KEY = previous));

  it("chiffre puis déchiffre, sans laisser la clé en clair", () => {
    const stored = encryptGristApiKey("cle-api-grist");

    expect(stored).toMatch(/^v1:[^:]+:[^:]+:[^:]+$/);
    expect(stored).not.toContain("cle-api-grist");
    expect(decryptGristApiKey(stored)).toBe("cle-api-grist");
  });

  it("produit un chiffré différent à chaque fois (IV aléatoire)", () => {
    expect(encryptGristApiKey("cle")).not.toBe(encryptGristApiKey("cle"));
  });

  it.each([
    ["une clé enregistrée en clair", () => "cle-en-clair"],
    [
      "un chiffré altéré",
      () =>
        encryptGristApiKey("cle").replace(/.$/, (c) => (c === "A" ? "B" : "A")),
    ],
    [
      "un autre secret",
      () => {
        const stored = encryptGristApiKey("cle");
        process.env.GRIST_ENCRYPTION_KEY = "autre-secret";
        return stored;
      },
    ],
  ])("renvoie null pour %s", (_, stored) => {
    expect(decryptGristApiKey(stored())).toBeNull();
  });

  it("refuse de chiffrer sans GRIST_ENCRYPTION_KEY", () => {
    delete process.env.GRIST_ENCRYPTION_KEY;
    expect(() => encryptGristApiKey("cle")).toThrow(
      ServiceUnavailableException,
    );
  });
});
