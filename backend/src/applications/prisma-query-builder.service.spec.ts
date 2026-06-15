import { PrismaQueryBuilder } from "src/applications/prisma-query-builder.service";
import { ApplicationSearchFilters } from "src/applications/infrastructure/repository/application.repository.interface";
import { PrismaService } from "src/prisma/prisma.service";
import { QueryBuilderGroupActor } from "src/common/service/prisma-query-builder.service";
import { Requestor } from "src/user/entities/user.entity";

describe("PrismaQueryBuilder — filtres de conformité", () => {
  const prisma = {
    $queryRawUnsafe: jest.fn().mockResolvedValue([]),
  } as unknown as PrismaService;
  const groupActor = {
    build: jest.fn().mockReturnValue(""),
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
    it("présent → dima_duration_hours renseigné", async () => {
      const and = await buildAnd({ compliancePresent__in: ["dima"] });
      expect(and).toContainEqual({
        compliance: { dima_duration_hours: { not: null } },
      });
    });

    it("absent → négation (non renseigné)", async () => {
      const and = await buildAnd({ complianceAbsent__in: ["dima"] });
      expect(and).toContainEqual({
        NOT: { compliance: { dima_duration_hours: { not: null } } },
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
});
