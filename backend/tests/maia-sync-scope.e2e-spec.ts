import { Roles } from "@prisma/client";
import request from "supertest";
import { OrganizationFaker } from "./fakers/organization.faker";
import { getPrismaClient } from "./fakers/prisma";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

/**
 * #2374 / #2365 — Les routes de synchronisation MAIA :
 *  - `by-email` (LECTURE, préremplissage du formulaire acteur) était réservée à AdminPanelManage,
 *    trop haut pour un contributeur → abaissée à AppList ;
 *  - `:id/sync` (ÉCRITURE) n'appliquait aucun contrôle de périmètre → un admin scopé ne peut plus
 *    synchroniser un utilisateur hors de son périmètre ;
 *  - le batch réécrit tous les utilisateurs → réservé aux administrateurs sans périmètre.
 */
describe("Synchronisation MAIA — permission et périmètre (#2374, #2365)", () => {
  const app = setupTestSuite();
  const suffix = Date.now();
  let previousMock: string | undefined;

  let visitor: Awaited<ReturnType<typeof UserFaker.create>>;
  let contributor: Awaited<ReturnType<typeof UserFaker.create>>;
  let globalAdmin: Awaited<ReturnType<typeof UserFaker.create>>;
  let scopedAdmin: Awaited<ReturnType<typeof UserFaker.create>>;
  let targetInScope: Awaited<ReturnType<typeof UserFaker.create>>;
  let targetOutScope: Awaited<ReturnType<typeof UserFaker.create>>;

  beforeAll(async () => {
    previousMock = process.env.MOCK_MAIA_SERVICE;
    process.env.MOCK_MAIA_SERVICE = "true"; // MAIA renvoie une organisation factice

    const scopeOrg = await OrganizationFaker.create({
      path: `E2E/MAIA-${suffix}`,
    });
    const inScopeOrg = await OrganizationFaker.create({
      path: `E2E/MAIA-${suffix}/SDIT`,
    });
    const outScopeOrg = await OrganizationFaker.create({
      path: `E2E/OTHER-${suffix}`,
    });

    visitor = await UserFaker.create({ role: Roles.VISITOR });
    contributor = await UserFaker.create({ role: Roles.CONTRIBUTOR });
    globalAdmin = await UserFaker.create({ role: Roles.ADMIN });
    scopedAdmin = await UserFaker.create({ role: Roles.ADMIN });
    await scopedAdmin.update({
      scopeOrganization: { connect: { id: scopeOrg.id } },
    });
    targetInScope = await UserFaker.create({ role: Roles.VISITOR });
    await targetInScope.update({
      organization: { connect: { id: inScopeOrg.id } },
    });
    targetOutScope = await UserFaker.create({ role: Roles.VISITOR });
    await targetOutScope.update({
      organization: { connect: { id: outScopeOrg.id } },
    });
  });

  afterAll(() => {
    if (previousMock === undefined) delete process.env.MOCK_MAIA_SERVICE;
    else process.env.MOCK_MAIA_SERVICE = previousMock;
  });

  describe("by-email (lecture, #2365)", () => {
    const route = (email: string) =>
      `/users/by-email/${encodeURIComponent(email)}/sync-organization-from-maia`;

    // Route de LECTURE (suggestion) : `AppList` est portée par tous les rôles authentifiés — le
    // durcissement de #2365 est de ne PLUS exiger AdminPanelManage, pas de restreindre davantage.
    it("n'est plus réservée aux administrateurs : accessible à un contributeur", async () => {
      await request(app().getHttpServer())
        .get(route("qui@example.com"))
        .set("Authorization", `Bearer ${await getToken(contributor)}`)
        .expect(200);
    });

    it("accessible aussi à un visiteur authentifié (lecture)", async () => {
      await request(app().getHttpServer())
        .get(route("qui@example.com"))
        .set("Authorization", `Bearer ${await getToken(visitor)}`)
        .expect(200);
    });

    it("refuse une recherche sans authentification", async () => {
      await request(app().getHttpServer())
        .get(route("acteur@finances.example.test"))
        .expect(401);
    });

    describe("acteur externe sans compte RefApp", () => {
      let previousMaiaUrl: string | undefined;

      beforeAll(() => {
        previousMaiaUrl = process.env.MAIA_API_URL;
        process.env.MAIA_API_URL = "http://maia.test/find";
        process.env.MOCK_MAIA_SERVICE = "false";
      });

      afterEach(() => {
        jest.restoreAllMocks();
      });

      afterAll(() => {
        if (previousMaiaUrl === undefined) delete process.env.MAIA_API_URL;
        else process.env.MAIA_API_URL = previousMaiaUrl;
        process.env.MOCK_MAIA_SERVICE = "true";
      });

      it.each([
        { label: "existante", organizationExists: true },
        { label: "absente du référentiel", organizationExists: false },
      ])(
        "retourne le nom et l'organisation $label sans créer de compte",
        async ({ organizationExists }) => {
          const email = `acteur-${suffix}-${organizationExists}@finances.example.test`;
          const organizationPath = `E2E/FINANCES-${suffix}/${organizationExists}`;
          const existingOrganization = organizationExists
            ? await OrganizationFaker.create({ path: organizationPath })
            : null;
          const prisma = getPrismaClient();
          expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
          if (!organizationExists) {
            expect(
              await prisma.organization.findFirst({
                where: { path: organizationPath },
              }),
            ).toBeNull();
          }

          const fetchMock = jest
            .spyOn(global, "fetch")
            .mockImplementation(async () =>
              Response.json({
                data: [
                  {
                    values: {
                      firstName: "Camille",
                      lastName: "Externe",
                      fullName: "Camille Externe",
                      structure: { values: { fullCode: organizationPath } },
                    },
                  },
                ],
              }),
            );

          const response = await request(app().getHttpServer())
            .get(route(email))
            .set("Authorization", `Bearer ${getToken(contributor)}`)
            .expect(200);

          expect(fetchMock).toHaveBeenCalledWith(
            "http://maia.test/find",
            expect.objectContaining({
              method: "POST",
              body: expect.stringContaining(JSON.stringify(email)),
            }),
          );
          expect(response.body).toMatchObject({
            firstName: "Camille",
            lastName: "Externe",
            fullName: "Camille Externe",
            organizationPath,
            organizationId: expect.any(String),
          });
          const organization = await prisma.organization.findUnique({
            where: { id: response.body.organizationId },
          });
          expect(organization?.path).toBe(organizationPath);
          if (existingOrganization) {
            expect(organization?.id).toBe(existingOrganization.id);
          }
          expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
        },
      );
    });
  });

  describe(":id/sync (écriture, #2374)", () => {
    const route = (id: string) => `/users/${id}/sync-organization-from-maia`;

    it("refuse à un admin scopé une cible hors de son périmètre (403)", async () => {
      await request(app().getHttpServer())
        .post(route(targetOutScope.id))
        .set("Authorization", `Bearer ${await getToken(scopedAdmin)}`)
        .expect(403);
    });

    it("autorise un admin scopé sur une cible de son périmètre", async () => {
      const res = await request(app().getHttpServer())
        .post(route(targetInScope.id))
        .set("Authorization", `Bearer ${await getToken(scopedAdmin)}`);
      expect(res.status).not.toBe(403);
    });
  });

  describe("batch (#2374)", () => {
    const route = "/users/sync-organizations-from-maia";

    it("refuse un admin scopé (403)", async () => {
      await request(app().getHttpServer())
        .post(route)
        .send({ onlyMissing: true })
        .set("Authorization", `Bearer ${await getToken(scopedAdmin)}`)
        .expect(403);
    });

    it("autorise un admin global", async () => {
      const res = await request(app().getHttpServer())
        .post(route)
        .send({ onlyMissing: true })
        .set("Authorization", `Bearer ${await getToken(globalAdmin)}`);
      expect(res.status).not.toBe(403);
    });
  });
});
