import { DELEGATED_AUTH } from "src/permissions/delegated-auth";
import { IMPERSONATION_AUTH } from "src/permissions/impersonation-auth";
import type { Requestor } from "src/user/entities/user.entity";
import { Permission, Roles } from "@prisma/client";
import request from "supertest";
import { ApplicationRepository } from "src/applications/infrastructure/repository/application.repository";
import { technicalDebtAccessWhere } from "src/common/utils/technical-debt-access.utils";
import { getPrismaClient } from "./fakers/prisma";
import { UserFaker } from "./fakers/user.faker";
import { OrganizationFaker } from "./fakers/organization.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

describe("Dette IT — périmètre et rattachements personnels", () => {
  const app = setupTestSuite();
  const prisma = getPrismaClient();
  const label = `debt-scope-${Date.now()}`;
  let token: string;
  const globalTokens: { role: string; token: string }[] = [];
  let normalToken: string;
  let noOrganizationToken: string;
  let scopedRequestor: Requestor;
  let ownOrganization: string;
  let ownDivision: string;
  let organizationChild: string;
  let delegatedToken: string;
  let inside: string;
  let child: string;
  let outside: string;
  let scope: Awaited<ReturnType<typeof OrganizationFaker.create>>;

  beforeAll(async () => {
    scope = await OrganizationFaker.create({ path: `/${label}/SG` });
    const descendant = await OrganizationFaker.create({
      path: `${scope.path}/BUREAU`,
    });
    const sibling = await OrganizationFaker.create({
      path: `${scope.path}AMI`,
    });
    const personal = await OrganizationFaker.create({
      path: `/${label}/PERSONAL`,
    });
    const personalChild = await OrganizationFaker.create({
      path: `${personal.path}/CHILD`,
    });
    const personalDivision = await prisma.businessDivision.create({
      data: { label: `${label}-personal-division` },
    });
    const organization = await prisma.organization.update({
      where: { id: personal.id },
      data: { businessDivisionId: personalDivision.id },
    });
    const user = await UserFaker.create({ role: Roles.ADMIN });
    const updated = await user.update({
      scopeOrganization: { connect: { id: scope.id } },
      organization: { connect: { id: personal.id } },
    });
    scopedRequestor = { ...updated, organization, scopeOrganization: scope };
    const actorType = await prisma.actorType.create({ data: { label } });
    token = getToken(user);
    for (const role of [Roles.READER, Roles.CONTRIBUTOR, Roles.ADMIN]) {
      globalTokens.push({
        role,
        token: getToken(await UserFaker.create({ role })),
      });
    }
    const normal = await UserFaker.create();
    await normal.update({ organization: { connect: { id: personal.id } } });
    normalToken = getToken(normal);
    noOrganizationToken = getToken(
      await UserFaker.create({ additionalPermissions: [Permission.MDITList] }),
    );
    const delegated = await UserFaker.create({
      role: Roles.VISITOR,
      additionalPermissions: [Permission.MDITList],
    });
    await delegated.update({
      organization: { connect: { id: personal.id } },
    });
    delegatedToken = getToken(delegated);
    const make = async (
      name: string,
      organizationId: string,
      millesime: number,
      division = false,
    ) => {
      const record = await prisma.application.create({
        data: {
          label: `${label}-${name}`,
          description: "Test périmètre dette IT",
          quality: 100,
          technicalDebtInfo: {
            create: {
              millesime,
              technicalMaturity: 3,
              businessMaturity: 4,
              costContainment: 2,
            },
          },
          ...(division
            ? {
                businessDivisions: {
                  create: {
                    label: `${label}-${name}-division`,
                    organizations: { connect: { id: organizationId } },
                  },
                },
              }
            : {
                actors: {
                  create: {
                    organizationId,
                    email: user.email,
                    actorTypeId: actorType.id,
                  },
                },
              }),
        },
      });
      return record.id;
    };
    inside = await make("inside", scope.id, 2025);
    child = await make("child", descendant.id, 2025, true);
    outside = await make("outside", sibling.id, 2026);
    ownOrganization = await make("own-org", personal.id, 2025);
    ownDivision = await make("own-division", sibling.id, 2025);
    await prisma.application.update({
      where: { id: ownDivision },
      data: { businessDivisions: { connect: { id: personalDivision.id } } },
    });
    organizationChild = await make("own-child", personalChild.id, 2026);
  });

  const get = (url: string, auth = token) =>
    request(app().getHttpServer())
      .get(url)
      .set("Authorization", `Bearer ${auth}`);

  it("conserve les fiches mais masque la dette extérieure dans la recherche et TIME", async () => {
    const { body } = await get("/applications")
      .query({ label, pageSize: 0 })
      .expect(200);
    expect(body.results).toHaveLength(6);
    expect(
      body.results.find((row: { id: string }) => row.id === outside)
        .technicalDebtInfo,
    ).toBeNull();
    expect(
      body.technicalDebtPoints.map((row: { id: string }) => row.id).sort(),
    ).toEqual([inside, child, ownOrganization, ownDivision].sort());
  });

  it.each(["technicalMaturity", "businessMaturity", "costContainment"])(
    "ne révèle pas la dette extérieure via le tri %s",
    async (sortBy) => {
      const { body } = await get("/applications")
        .query({ label, pageSize: 0, sortBy })
        .expect(200);
      expect(body.results.map((row: { id: string }) => row.id).sort()).toEqual(
        [inside, child, ownOrganization, ownDivision].sort(),
      );
    },
  );

  it("ne permet pas de forcer un millésime hors périmètre", async () => {
    const { body } = await get("/applications")
      .query({ label, millesime: 2026 })
      .expect(200);
    expect(body.results).toEqual([]);
    const points = await get("/technical-debts")
      .query({ label, millesime: 2026 })
      .expect(200);
    expect(points.body).toEqual([]);
  });

  it("filtre les millésimes et utilise le dernier accessible", async () => {
    expect((await get("/technical-debts/millesimes").expect(200)).body).toEqual(
      [2025],
    );
    const { body } = await get("/technical-debts").query({ label }).expect(200);
    expect(body.map((row: { id: string }) => row.id).sort()).toEqual(
      [inside, child, ownOrganization, ownDivision].sort(),
    );
  });

  it("refuse l'historique extérieur même pour un administrateur acteur", async () => {
    await get(`/applications/${outside}/technical-debt-info`).expect(403);
    await get(`/applications/${inside}/technical-debt-info`).expect(200);
    await get(`/applications/${child}/technical-debt-info`).expect(200);
  });

  it("une permission déléguée ne supprime pas le périmètre", async () => {
    const { body } = await get("/technical-debts", delegatedToken)
      .query({ label, millesime: 2026 })
      .expect(200);
    expect(body).toEqual([]);
  });

  it("conserve l'accès global sans périmètre pour chaque rôle élevé", async () => {
    for (const { token } of globalTokens) {
      await get(`/applications/${outside}/technical-debt-info`, token).expect(
        200,
      );
      const { body } = await get("/applications", token)
        .query({ label, pageSize: 0 })
        .expect(200);
      expect(body.technicalDebtPoints).toHaveLength(6);
    }
  });

  it("masque la relation dans les lignes exportées vers Grist", async () => {
    const repository = app().get(ApplicationRepository);
    const rows = await repository.findSearchItems(
      { label: { startsWith: label } },
      { label: "asc" },
      technicalDebtAccessWhere(scopedRequestor),
    );
    expect(
      rows.find((row) => row.id === outside)?.technicalDebtInfo,
    ).toBeNull();
    expect(
      rows.find((row) => row.id === inside)?.technicalDebtInfo,
    ).not.toBeNull();
  });

  it("refuse un périmètre non résolu", () => {
    expect(() =>
      technicalDebtAccessWhere({
        ...scopedRequestor,
        scopeOrganizationId: scope.id,
        scopeOrganization: null,
      }),
    ).toThrow("Périmètre d'authentification invalide");
  });
  it("ajoute organisation exacte et direction métier hors périmètre pour chaque rôle élevé", async () => {
    for (const role of [Roles.READER, Roles.CONTRIBUTOR, Roles.ADMIN]) {
      const user = await UserFaker.create({ role });
      await user.update({
        scopeOrganization: { connect: { id: scope.id } },
        organization: { connect: { id: scopedRequestor.organizationId } },
      });
      const auth = getToken(user);
      const { body } = await get("/technical-debts", auth)
        .query({ label, millesime: 2025 })
        .expect(200);
      expect(body.map((row: { id: string }) => row.id).sort()).toEqual(
        [inside, child, ownOrganization, ownDivision].sort(),
      );
      await get(
        `/applications/${ownOrganization}/technical-debt-info`,
        auth,
      ).expect(200);
      await get(
        `/applications/${ownDivision}/technical-debt-info`,
        auth,
      ).expect(200);
      await get(
        `/applications/${organizationChild}/technical-debt-info`,
        auth,
      ).expect(403);
    }
  });

  it("limite un utilisateur normal avec MDIT à son organisation exacte ou sa direction métier", async () => {
    const { body } = await get("/applications", delegatedToken)
      .query({ label, pageSize: 0 })
      .expect(200);
    expect(body.results).toHaveLength(6);
    expect(
      body.technicalDebtPoints.map((row: { id: string }) => row.id).sort(),
    ).toEqual([ownOrganization, ownDivision].sort());
    const points = await get("/technical-debts", delegatedToken)
      .query({ label })
      .expect(200);
    expect(points.body.map((row: { id: string }) => row.id).sort()).toEqual(
      [ownOrganization, ownDivision].sort(),
    );
    await get(
      `/applications/${ownOrganization}/technical-debt-info`,
      delegatedToken,
    ).expect(200);
    await get(
      `/applications/${ownDivision}/technical-debt-info`,
      delegatedToken,
    ).expect(200);
    await get(
      `/applications/${organizationChild}/technical-debt-info`,
      delegatedToken,
    ).expect(403);
    await get(
      `/applications/${inside}/technical-debt-info`,
      delegatedToken,
    ).expect(403);
  });

  it("n'accorde aucun accès dette à un utilisateur normal sans MDIT ou sans rattachement", async () => {
    for (const auth of [normalToken, noOrganizationToken]) {
      const { body } = await get("/applications", auth)
        .query({ label, pageSize: 0 })
        .expect(200);
      expect(body.results).toHaveLength(6);
      expect(body.technicalDebtPoints).toEqual([]);
      await get(
        `/applications/${ownOrganization}/technical-debt-info`,
        auth,
      ).expect(403);
    }
    await get("/technical-debts", normalToken).expect(403);
    expect(
      (await get("/technical-debts", noOrganizationToken).expect(200)).body,
    ).toEqual([]);
  });

  it("conserve le plafond d'un token de service malgré le rattachement personnel de l'humain", async () => {
    const service: Requestor = {
      ...scopedRequestor,
      type: "bot",
      organizationId: null,
      organization: null,
    };
    const effective: Requestor = {
      ...scopedRequestor,
      [DELEGATED_AUTH]: { human: scopedRequestor, service },
    };
    const rows = await app()
      .get(ApplicationRepository)
      .findSearchItems(
        { label: { startsWith: label } },
        { label: "asc" },
        technicalDebtAccessWhere(effective),
      );
    expect(
      rows.find((row) => row.id === inside)?.technicalDebtInfo,
    ).not.toBeNull();
    expect(
      rows.find((row) => row.id === ownOrganization)?.technicalDebtInfo,
    ).toBeNull();
    expect(
      rows.find((row) => row.id === ownDivision)?.technicalDebtInfo,
    ).toBeNull();
  });

  it("l'impersonation n'élargit pas le plafond de la session", async () => {
    const admin: Requestor = {
      ...scopedRequestor,
      organizationId: null,
      organization: null,
    };
    const effective: Requestor = {
      ...scopedRequestor,
      [IMPERSONATION_AUTH]: { admin, target: scopedRequestor },
    };
    const rows = await app()
      .get(ApplicationRepository)
      .findSearchItems(
        { label: { startsWith: label } },
        { label: "asc" },
        technicalDebtAccessWhere(effective),
      );
    expect(
      rows.find((row) => row.id === inside)?.technicalDebtInfo,
    ).not.toBeNull();
    expect(
      rows.find((row) => row.id === ownOrganization)?.technicalDebtInfo,
    ).toBeNull();
  });
});
