import { PrismaQueryBuilder } from "src/applications/prisma-query-builder.service";
import { ApplicationSearchFilters } from "src/applications/infrastructure/repository/application.repository.interface";
import { PrismaService } from "src/prisma/prisma.service";
import { QueryBuilderGroupActor } from "src/common/service/prisma-query-builder.service";
import { Requestor } from "src/user/entities/user.entity";
import { DIMA_FILLED_FIELDS } from "src/common/utils/compliance-presence.utils";

describe("PrismaQueryBuilder — filtres de conformité", () => {
  const prisma = {
    $queryRaw: jest.fn().mockResolvedValue([]),
  } as unknown as PrismaService;
  const groupActor = {
    buildApplicationIds: jest.fn().mockReturnValue(""),
  } as unknown as QueryBuilderGroupActor;
  const requestor = { email: "user@example.com" } as unknown as Requestor;

  const builder = new PrismaQueryBuilder(prisma, groupActor);

  const buildAnd = async (filters: Partial<ApplicationSearchFilters>) => {
    const where = await builder.buildSearchWhere(
      filters as ApplicationSearchFilters,
      requestor,
    );
    return where.AND;
  };

  describe("critère booléen (PRA)", () => {
    it("présent → dima_recovery_plan: true", async () => {
      const and = await buildAnd({ compliancePresent__in: ["pra"] });
      expect(and).toContainEqual({ compliance: { dima_recovery_plan: true } });
    });

    it("absent → dima_recovery_plan: false (Non explicite)", async () => {
      const and = await buildAnd({ complianceAbsent__in: ["pra"] });
      expect(and).toContainEqual({ compliance: { dima_recovery_plan: false } });
    });

    it("non renseigné → NOT(dima_recovery_plan renseigné)", async () => {
      const and = await buildAnd({ complianceUnset__in: ["pra"] });
      expect(and).toContainEqual({
        NOT: { compliance: { dima_recovery_plan: { not: null } } },
      });
    });
  });

  describe("critère de présence (dima)", () => {
    const dimaFilledOr = DIMA_FILLED_FIELDS.map((field) => ({
      [field]: { not: null },
    }));

    it("présent → au moins un champ DIMA renseigné (durée, impact métier ou PRA)", async () => {
      const and = await buildAnd({ compliancePresent__in: ["dima"] });
      expect(and).toContainEqual({
        compliance: { OR: dimaFilledOr },
      });
    });

    it("absent → négation (aucun champ DIMA renseigné)", async () => {
      const and = await buildAnd({ complianceAbsent__in: ["dima"] });
      expect(and).toContainEqual({
        NOT: { compliance: { OR: dimaFilledOr } },
      });
    });

    it("ignore 'non renseigné' (pas de clause unset pour un critère de présence)", async () => {
      const and = await buildAnd({ complianceUnset__in: ["dima"] });
      expect(and).not.toContainEqual(
        expect.objectContaining({ compliance: expect.anything() }),
      );
    });
  });

  it("conserve la rétrocompatibilité de compliance__in (= présent)", async () => {
    const and = await buildAnd({ compliance__in: ["dsfr"] });
    expect(and).toContainEqual({ compliance: { dsfr_implemented: true } });
  });

  it("ignore les critères inconnus", async () => {
    const and = await buildAnd({ compliancePresent__in: ["inconnu"] });
    expect(and).not.toContainEqual(
      expect.objectContaining({ compliance: expect.anything() }),
    );
  });

  it("filtre IQ : iq__isNull=true ajoute les applications sans IQ à la plage", async () => {
    const and = await buildAnd({ iqGte: 50, iqLte: 80, iq__isNull: true });
    expect(and).toContainEqual({
      OR: [{ quality: { gte: 50, lte: 80 } }, { quality: null }],
    });
  });

  it("filtre IQ : sans iq__isNull, seule la plage s'applique (applications sans IQ exclues)", async () => {
    const and = await buildAnd({ iqGte: 50, iqLte: 80 });
    expect(and).toContainEqual({
      OR: [{ quality: { gte: 50, lte: 80 } }],
    });
  });
});

describe("PrismaQueryBuilder — filtre de corrélation (#2287)", () => {
  const prisma = {
    $queryRaw: jest.fn().mockResolvedValue([]),
  } as unknown as PrismaService;
  const groupActor = {
    buildApplicationIds: jest.fn().mockReturnValue(""),
  } as unknown as QueryBuilderGroupActor;
  const requestor = { email: "user@example.com" } as unknown as Requestor;

  const builder = new PrismaQueryBuilder(prisma, groupActor);

  const buildRelationAnd = async (
    filters: Partial<ApplicationSearchFilters>,
  ) => {
    const where = await builder.buildSearchWhere(
      filters as ApplicationSearchFilters,
      requestor,
    );
    // la requête de relations est le dernier bloc empilé dans le AND
    return where.AND[where.AND.length - 1];
  };

  // La corrélation est symétrique : la direction de stockage ne doit pas
  // influer sur le résultat de la recherche.
  const symmetricQuery = {
    OR: [
      {
        relationsAsSource: {
          some: { applicationTargetId: "app-a", type: "is_correlated_with" },
        },
      },
      {
        relationsAsTarget: {
          some: { applicationSourceId: "app-a", type: "is_correlated_with" },
        },
      },
    ],
  };

  it("INCLUDE : retient les applications corrélées dans un sens comme dans l'autre", async () => {
    const relationAnd = await buildRelationAnd({
      is_correlated_with: "INCLUDE",
      relationAppId: "app-a",
    });

    expect(relationAnd).toEqual({ AND: [{ OR: [symmetricQuery] }] });
  });

  it("EXCLUDE : écarte les deux directions", async () => {
    const relationAnd = await buildRelationAnd({
      is_correlated_with: "EXCLUDE",
      relationAppId: "app-a",
    });

    expect(relationAnd).toEqual({ AND: [{ NOT: symmetricQuery }] });
  });

  it("NEUTRAL : n'ajoute aucune contrainte", async () => {
    const relationAnd = await buildRelationAnd({
      is_correlated_with: "NEUTRAL",
      relationAppId: "app-a",
    });

    expect(relationAnd).toEqual({ AND: [] });
  });
});

/**
 * #2416 — « Mes applications » doit rester cloisonné à l'organisation. Le filtre appariait
 * les acteurs groupe sur leur seul `actorTypeId`, un identifiant de table de référence
 * GLOBALE : toute application portant un acteur groupe du même type remontait comme
 * « mienne », même si son acteur groupe appartenait à une autre organisation.
 */
describe("PrismaQueryBuilder — filtre « Mes applications » (#2416)", () => {
  const requestor = {
    email: "user@example.com",
    organization: { path: "TOTO" },
  } as unknown as Requestor;

  const buildMyApplicationsClause = async (coveredApplicationIds: string[]) => {
    const prisma = {
      $queryRaw: jest
        .fn()
        .mockResolvedValue(
          coveredApplicationIds.map((applicationId) => ({ applicationId })),
        ),
    } as unknown as PrismaService;
    const groupActor = {
      buildApplicationIds: jest.fn().mockReturnValue(""),
    } as unknown as QueryBuilderGroupActor;

    const where = await new PrismaQueryBuilder(
      prisma,
      groupActor,
    ).buildSearchWhere(
      { myApplications: true } as ApplicationSearchFilters,
      requestor,
    );
    return where.AND.find((clause) => "OR" in clause) as { OR: unknown[] };
  };

  it("restreint aux applications réellement couvertes, jamais à un type d'acteur", async () => {
    const clause = await buildMyApplicationsClause(["app-couverte"]);

    expect(clause.OR).toContainEqual({ id: { in: ["app-couverte"] } });
    expect(JSON.stringify(clause)).not.toContain("actorTypeId");
  });

  it("conserve l'appariement de l'utilisateur par email", async () => {
    const clause = await buildMyApplicationsClause([]);

    expect(clause.OR).toContainEqual({
      actors: {
        some: { email: { equals: "user@example.com", mode: "insensitive" } },
      },
    });
  });

  it("n'élargit à aucune application quand aucun acteur groupe ne couvre l'utilisateur", async () => {
    const clause = await buildMyApplicationsClause([]);

    expect(clause.OR).toHaveLength(1);
  });
});
