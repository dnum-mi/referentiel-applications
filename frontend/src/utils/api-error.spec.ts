import { backendErrorMessage } from "./api-error";

describe("backendErrorMessage", () => {
  it("renvoie le message d'une erreur NestJS", () => {
    expect(backendErrorMessage({ message: "Ce produit est déjà renseigné", statusCode: 409 })).toBe("Ce produit est déjà renseigné");
  });

  it("concatène les messages de validation (class-validator)", () => {
    expect(backendErrorMessage({ message: ["product ne doit pas être vide", "docUrl doit être une URL"] })).toBe(
      "product ne doit pas être vide docUrl doit être une URL",
    );
  });

  it("renvoie null sans message exploitable", () => {
    expect(backendErrorMessage(undefined)).toBeNull();
    expect(backendErrorMessage(null)).toBeNull();
    expect(backendErrorMessage({})).toBeNull();
    expect(backendErrorMessage({ message: "   " })).toBeNull();
    expect(backendErrorMessage({ message: [] })).toBeNull();
    expect(backendErrorMessage({ message: 42 })).toBeNull();
    expect(backendErrorMessage("texte brut")).toBeNull();
  });
});
