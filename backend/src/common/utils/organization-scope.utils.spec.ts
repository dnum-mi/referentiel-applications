import { organizationWithinScope } from "./organization-scope.utils";

/**
 * #2370 — Le prédicat doit couvrir le périmètre lui-même et ses descendants, et RIEN d'autre.
 * Les deux formes fautives historiques sont vérifiées explicitement : le `contains`
 * (sous-chaîne) et le `startsWith` nu, qui laissaient l'un comme l'autre un scope `/SG`
 * déborder sur `/SGAMI`.
 */
describe("organizationWithinScope", () => {
  const matches = (scope: string, path: string) => {
    const { OR } = organizationWithinScope(scope) as {
      OR: { path: { equals?: string; startsWith?: string } }[];
    };
    return OR.some(({ path: p }) =>
      p.equals !== undefined
        ? p.equals.toLowerCase() === path.toLowerCase()
        : path.toLowerCase().startsWith(p.startsWith!.toLowerCase()),
    );
  };

  it("retient le périmètre lui-même", () => {
    expect(matches("/SG", "/SG")).toBe(true);
  });

  it("retient les descendants à la frontière de segment", () => {
    expect(matches("/SG", "/SG/BUREAU")).toBe(true);
    expect(matches("/SG", "/SG/BUREAU/CELLULE")).toBe(true);
  });

  it("écarte une organisation dont le nom PROLONGE le segment du périmètre", () => {
    // Le cas du préfixe nu : /SG ne doit pas couvrir /SGAMI.
    expect(matches("/SG", "/SGAMI")).toBe(false);
    expect(matches("/SGAMI/SU", "/SGAMI/SUD")).toBe(false);
  });

  it("écarte une organisation qui CONTIENT le périmètre ailleurs dans son path", () => {
    // Le cas de la sous-chaîne : /SG ne doit pas couvrir /MI/DNUM/SG.
    expect(matches("/SG", "/MI/DNUM/SG")).toBe(false);
    expect(matches("/SG", "/AUTRE/SG-BIS")).toBe(false);
  });

  it("reste insensible à la casse", () => {
    const { OR } = organizationWithinScope("/SG") as {
      OR: { path: { mode?: string } }[];
    };
    expect(OR.every(({ path }) => path.mode === "insensitive")).toBe(true);
  });
});
