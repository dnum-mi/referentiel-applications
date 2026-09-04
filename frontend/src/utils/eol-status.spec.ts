import { EOL_SOON_MS, computeEolStatus, endoflifeProductUrl } from "./eol-status";

const day = 24 * 60 * 60 * 1000;
const now = new Date("2026-09-04T12:00:00Z").getTime();
const at = (offsetMs: number) => new Date(now + offsetMs).toISOString();

describe("eol-status (front)", () => {
  it("classe par gravité : fin de vie, proche, support actif dépassé, rien", () => {
    expect(computeEolStatus({ eolDate: at(-day), eoasDate: null }, now)).toBe("eol");
    expect(computeEolStatus({ eolDate: at(30 * day), eoasDate: null }, now)).toBe("eol-soon");
    expect(computeEolStatus({ eolDate: at(EOL_SOON_MS + day), eoasDate: at(-day) }, now)).toBe("eoas-passed");
    expect(computeEolStatus({ eolDate: at(EOL_SOON_MS + day), eoasDate: at(day) }, now)).toBeNull();
    expect(computeEolStatus({ eolDate: null, eoasDate: null }, now)).toBeNull();
  });

  it("ne construit un lien endoflife.date que pour un slug d'API", () => {
    expect(endoflifeProductUrl("postgresql")).toBe("https://endoflife.date/postgresql");
    expect(endoflifeProductUrl("eclipse-temurin")).toBe("https://endoflife.date/eclipse-temurin");
    expect(endoflifeProductUrl(null)).toBeNull();
    expect(endoflifeProductUrl("")).toBeNull();
    expect(endoflifeProductUrl("../etc")).toBeNull();
    expect(endoflifeProductUrl("Outil maison")).toBeNull();
  });
});
