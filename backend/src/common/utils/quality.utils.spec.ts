import type { PrismaService } from "src/prisma/prisma.service";
import { calculateIQ, getQualitySummary } from "./quality.utils";

const makePrisma = (overrides: { actorCodes?: string[] } = {}) => ({
  application: {
    findUnique: jest.fn().mockResolvedValue({ description: "Desc" }),
  },
  hosting: { findFirst: jest.fn().mockResolvedValue({ id: "h-1" }) },
  actor: {
    findMany: jest
      .fn()
      .mockResolvedValue(
        (overrides.actorCodes ?? ["MOA", "MOE", "TMA", "HEB", "REP"]).map(
          (code) => ({ actorType: { code } }),
        ),
      ),
  },
  compliance: {
    findFirst: jest.fn().mockResolvedValue({
      homologation_date_end: new Date(),
      dsfr_implemented: true,
      rgpd_has_aipd: false,
    }),
  },
  externalRessource: {
    findMany: jest
      .fn()
      .mockResolvedValue([{ link: "https://SnapVisu.example/app" }]),
  },
  rgaaCompliance: { findMany: jest.fn().mockResolvedValue([]) },
});

describe("quality.utils (B22 : requêtes de qualité mutualisées)", () => {
  it("getQualitySummary : une requête par source", async () => {
    const prisma = makePrisma();

    const summary = await getQualitySummary(
      "app-1",
      prisma as unknown as PrismaService,
    );

    expect(summary).toMatchObject({
      hasDescription: true,
      hasHosting: true,
      hasSnapvisu: true,
      actors: { MOA: true, MOE: true, TMA: true, HEB: true, REP: true },
      compliances: {
        HOMOLOGATION: true,
        RGAA: false,
        DSFR: true,
        RGPD: false,
      },
    });
    for (const delegate of Object.values(prisma)) {
      for (const query of Object.values(delegate)) {
        expect(query).toHaveBeenCalledTimes(1);
      }
    }
  });

  it("calculateIQ : barème inchangé", async () => {
    // Importance 1 complète → 50. MOE manquant : 1 manque d'importance 2 → 5.
    // REP, PDMA et DIMA manquants : 3 manques d'importance 3 → 5.
    const prisma = makePrisma({ actorCodes: ["MOA", "TMA", "HEB"] });

    expect(await calculateIQ("app-1", prisma as unknown as PrismaService)).toBe(
      60,
    );
  });
});
