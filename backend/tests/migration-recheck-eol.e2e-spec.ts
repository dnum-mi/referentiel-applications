import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Roles } from "@prisma/client";
import { ApplicationFaker } from "./fakers/application.faker";
import { getPrismaClient } from "./fakers/prisma";
import { UserFaker } from "./fakers/user.faker";
import { setupTestSuite } from "./setup";

/**
 * #2526 : la migration de rattrapage de #2449 n'avait été validée que sur base vide. Rejouée ici
 * sur des lignes représentatives : seule la ligne « produit suivi + version saisie + aucune
 * échéance + aucun cycle » doit repasser « jamais vérifiée ».
 */
describe("Migration 20260903030000_recheck_eol_rows_without_cycle sur base peuplée", () => {
  setupTestSuite();
  const prisma = getPrismaClient();
  const sql = readFileSync(
    join(
      __dirname,
      "../prisma/migrations/20260903030000_recheck_eol_rows_without_cycle/migration.sql",
    ),
    "utf8",
  );

  it("ne remet à zéro que les lignes résolues sans échéance ni cycle", async () => {
    const owner = await UserFaker.create({ role: Roles.ADMIN });
    const application = await ApplicationFaker.create(owner);
    const checked = new Date();
    const base = { applicationId: application.id, eolCheckedAt: checked };
    const rows = await Promise.all([
      // Cas visé : produit suivi, version saisie, ni date ni cycle → à revérifier.
      prisma.technologyStack.create({
        data: {
          ...base,
          technology: "Serveur",
          product: "Apache",
          version: "2.4",
          eolProduct: "apache",
          eolCycle: null,
          eolDate: null,
        },
      }),
      // Une échéance connue : le badge reste, pas de remise à zéro.
      prisma.technologyStack.create({
        data: {
          ...base,
          technology: "BDD",
          product: "PostgreSQL",
          version: "13",
          eolProduct: "postgresql",
          eolCycle: null,
          eolDate: new Date("2025-11-13"),
        },
      }),
      // Cycle déjà persisté : rien à revérifier.
      prisma.technologyStack.create({
        data: {
          ...base,
          technology: "Langage",
          product: "Python",
          version: "3.12",
          eolProduct: "python",
          eolCycle: "3.12",
          eolDate: null,
        },
      }),
      // Produit non suivi (eolProduct null) : non concerné.
      prisma.technologyStack.create({
        data: {
          ...base,
          technology: "Interne",
          product: "Outil",
          version: "1",
          eolProduct: null,
          eolCycle: null,
          eolDate: null,
        },
      }),
      // Sans version : rien à apparier, non concerné.
      prisma.technologyStack.create({
        data: {
          ...base,
          technology: "Cache",
          product: "Redis",
          version: null,
          eolProduct: "redis",
          eolCycle: null,
          eolDate: null,
        },
      }),
    ]);

    await prisma.$executeRawUnsafe(sql);

    const after = await prisma.technologyStack.findMany({
      where: { id: { in: rows.map((row) => row.id) } },
      select: { product: true, eolCheckedAt: true },
    });
    const checkedAtOf = (product: string) => {
      const row = after.find((candidate) => candidate.product === product);
      return row ? row.eolCheckedAt : undefined;
    };
    expect(checkedAtOf("Apache")).toBeNull();
    expect(checkedAtOf("PostgreSQL")).toEqual(checked);
    expect(checkedAtOf("Python")).toEqual(checked);
    expect(checkedAtOf("Outil")).toEqual(checked);
    expect(checkedAtOf("Redis")).toEqual(checked);

    await ApplicationFaker.delete(application.id);
  });
});
