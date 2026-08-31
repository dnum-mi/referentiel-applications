import { Prisma } from "@prisma/client";
import { Requestor } from "src/user/entities/user.entity";
import { QueryBuilderGroupActor } from "./prisma-query-builder.service";

/**
 * #2366 — Ces requêtes étaient construites par interpolation de chaîne et exécutées via
 * `$queryRawUnsafe`, ce qui permettait une injection SQL par le paramètre d'URL `applicationId`
 * (et, dans une moindre mesure, par le path d'organisation). On vérifie ici que la valeur
 * dangereuse voyage désormais comme PARAMÈTRE (`Prisma.Sql.values`) et n'apparaît jamais dans le
 * texte SQL (`Prisma.Sql.strings`) — la garantie que Prisma la liera, sans jamais l'interpréter.
 */
describe("QueryBuilderGroupActor — requêtes paramétrées (#2366)", () => {
  const builder = new QueryBuilderGroupActor();

  const INJECTION = "x' OR '1'='1"; // apostrophe qui casserait toute interpolation naïve

  const userIn = (path: string | null): Requestor =>
    ({
      email: "user@example.com",
      organization: path ? { path } : null,
    }) as unknown as Requestor;

  const assertNoInterpolation = (sql: Prisma.Sql, danger: string) => {
    // Le texte assemblé ne contient jamais la valeur dangereuse…
    expect(sql.strings.join("")).not.toContain(danger);
    // …elle est présente uniquement comme paramètre lié.
    expect(sql.values).toContain(danger);
  };

  it("buildByApplication lie applicationId comme paramètre, pas comme texte SQL", () => {
    const sql = builder.buildByApplication(INJECTION, userIn("MI/DNUM"));
    assertNoInterpolation(sql, INJECTION);
    // Le texte reste un placeholder Postgres ($1/$2), jamais l'apostrophe injectée.
    expect(sql.strings.join("")).not.toContain("'x'");
  });

  it("buildByApplication lie aussi le path d'organisation comme paramètre", () => {
    const sql = builder.buildByApplication("app-1", userIn(INJECTION));
    assertNoInterpolation(sql, INJECTION);
  });

  it("buildApplicationIds lie le path d'organisation comme paramètre", () => {
    const sql = builder.buildApplicationIds(userIn(INJECTION));
    assertNoInterpolation(sql, INJECTION);
  });

  // Un path nul devient un paramètre NULL (et non la chaîne "null" interpolée) : le LIKE
  // n'apparie alors rien, comme attendu.
  it("gère un path d'organisation nul sans interpolation", () => {
    const sql = builder.buildApplicationIds(userIn(null));
    expect(sql.values).toContain(null);
    expect(sql.strings.join("")).not.toContain("null");
  });
});

/**
 * #2416 — Le filtre « Mes applications » résolvait les acteurs groupe en ne remontant que
 * leur `actorTypeId`. `ActorType` étant une table de référence GLOBALE (MOA, MOE…), le
 * rattachement à l'organisation était perdu : toute application portant un acteur groupe du
 * même type devenait « mienne », quelle que soit son organisation.
 */
describe("QueryBuilderGroupActor — cloisonnement par organisation (#2416)", () => {
  const builder = new QueryBuilderGroupActor();
  const userIn = (path: string | null): Requestor =>
    ({
      email: "user@example.com",
      organization: path ? { path } : null,
    }) as unknown as Requestor;

  const sqlTextOf = (sql: Prisma.Sql) => sql.strings.join("?");

  it("buildApplicationIds sélectionne des applicationId, jamais des actorTypeId", () => {
    const text = sqlTextOf(builder.buildApplicationIds(userIn("TOTO")));

    expect(text).toContain('a."applicationId"');
    expect(text).not.toContain('SELECT DISTINCT a."actorTypeId"');
  });

  it("ancre la filiation sur le séparateur de segment, pas sur une sous-chaîne", () => {
    const text = sqlTextOf(builder.buildApplicationIds(userIn("SGAMI/SUD")));

    // Un préfixe nu apparierait /SGAMI/SU avec /SGAMI/SUD.
    expect(text).toContain("|| '/%'");
    expect(text).not.toMatch(/LIKE lower\(o\.path\) \|\| '%'/);
    // L'égalité stricte couvre l'organisation elle-même.
    expect(text).toContain("= lower(o.path)");
  });

  it("buildByApplication ancre lui aussi la filiation", () => {
    const text = sqlTextOf(
      builder.buildByApplication("app-1", userIn("SGAMI/SUD")),
    );

    expect(text).toContain("|| '/%'");
    expect(text).not.toMatch(/LIKE lower\(o\.path\) \|\| '%'/);
  });

  it("écarte les acteurs groupe non rattachés à une application", () => {
    const text = sqlTextOf(builder.buildApplicationIds(userIn("TOTO")));

    expect(text).toContain('a."applicationId" IS NOT NULL');
  });
});
