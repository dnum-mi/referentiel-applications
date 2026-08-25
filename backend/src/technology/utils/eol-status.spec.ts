import { computeEolStatus, eolStatusWhere, EOL_SOON_MS } from "./eol-status";

const NOW = new Date("2026-08-25T00:00:00.000Z");
const day = 24 * 60 * 60 * 1000;
const at = (offsetMs: number) => new Date(NOW.getTime() + offsetMs);

describe("computeEolStatus", () => {
  it("classe en fin de vie une date déjà passée", () => {
    expect(computeEolStatus({ eolDate: at(-day) }, NOW)).toBe("eol");
  });

  it("classe en fin de vie proche une date à moins de six mois", () => {
    expect(computeEolStatus({ eolDate: at(30 * day) }, NOW)).toBe("eol-soon");
  });

  it("ne classe pas une fin de vie au-delà de six mois", () => {
    expect(
      computeEolStatus({ eolDate: at(EOL_SOON_MS + day) }, NOW),
    ).toBeNull();
  });

  // La cascade prime : une technologie déjà en fin de vie n'est pas rétrogradée
  // en « fin de support actif » sous prétexte que les deux dates sont passées.
  it("retient la fin de vie quand les deux dates sont dépassées", () => {
    expect(
      computeEolStatus({ eolDate: at(-day), eoasDate: at(-10 * day) }, NOW),
    ).toBe("eol");
  });

  it("signale la fin de support actif quand la fin de vie est lointaine", () => {
    expect(
      computeEolStatus(
        { eolDate: at(EOL_SOON_MS + day), eoasDate: at(-day) },
        NOW,
      ),
    ).toBe("eoas-passed");
  });

  it("ne classe rien sans aucune date", () => {
    expect(computeEolStatus({}, NOW)).toBeNull();
  });
});

describe("eolStatusWhere", () => {
  it("ne retient que le passé pour « eol »", () => {
    expect(eolStatusWhere("eol", NOW)).toEqual({ eolDate: { lt: NOW } });
  });

  it("borne « eol-soon » des deux côtés, pour ne pas absorber les fins de vie passées", () => {
    expect(eolStatusWhere("eol-soon", NOW)).toEqual({
      eolDate: { gte: NOW, lt: at(EOL_SOON_MS) },
    });
  });

  // Sans cette exclusion, filtrer « fin de support actif » ramènerait aussi les
  // technologies déjà en fin de vie : les trois filtres se chevaucheraient au
  // lieu de partitionner la liste.
  it("exclut de « eoas-passed » les technologies déjà en fin de vie ou proches", () => {
    expect(eolStatusWhere("eoas-passed", NOW)).toEqual({
      eoasDate: { lt: NOW },
      OR: [{ eolDate: null }, { eolDate: { gte: at(EOL_SOON_MS) } }],
    });
  });

  it("retient les trois statuts quand aucun n'est demandé", () => {
    expect(eolStatusWhere(undefined, NOW)).toEqual({
      OR: [{ eolDate: { lt: at(EOL_SOON_MS) } }, { eoasDate: { lt: NOW } }],
    });
  });

  /**
   * Le filtre SQL et le classement en mémoire doivent s'accorder : une ligne
   * retenue par `eolStatusWhere(s)` doit être classée `s` par `computeEolStatus`,
   * sans quoi la vue afficherait des lignes sous un statut qu'elles n'ont pas.
   */
  it.each([
    ["eol", { eolDate: at(-day), eoasDate: at(-2 * day) }],
    ["eol-soon", { eolDate: at(10 * day), eoasDate: null }],
    ["eoas-passed", { eolDate: at(EOL_SOON_MS + day), eoasDate: at(-day) }],
  ] as const)("accorde le filtre %s avec le classement", (status, row) => {
    expect(computeEolStatus(row, NOW)).toBe(status);
  });
});
