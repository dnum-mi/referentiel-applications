import { emailEquals, emailIn, normalizeEmail } from "./email.utils";

describe("email.utils (#2501)", () => {
  it("normalise en minuscules et sans espaces", () => {
    expect(normalizeEmail("  Jean.Dupont@Example.ORG ")).toBe(
      "jean.dupont@example.org",
    );
  });

  it("laisse passer null et undefined", () => {
    expect(normalizeEmail(null)).toBeNull();
    expect(normalizeEmail(undefined)).toBeUndefined();
    expect(normalizeEmail("")).toBe("");
  });

  it("emailEquals compare sans tenir compte de la casse", () => {
    expect(emailEquals("A@b.fr")).toEqual({
      equals: "A@b.fr",
      mode: "insensitive",
    });
  });

  it("emailIn dédoublonne (casse comprise) et refuse tout sur une liste vide", () => {
    expect(emailIn(["A@b.fr", "a@B.FR", "c@d.fr"])).toEqual({
      OR: [
        { email: { equals: "a@b.fr", mode: "insensitive" } },
        { email: { equals: "c@d.fr", mode: "insensitive" } },
      ],
    });
    expect(emailIn([])).toEqual({ id: { in: [] } });
  });
});
