import type { UserFakerReturnType } from "./fakers/user.faker";
import { Roles } from "@prisma/client";
import request from "supertest";
import { BusinessDivisionFaker } from "./fakers/business-division.faker";
import { OrganizationFaker } from "./fakers/organization.faker";
import { getPrismaClient } from "./fakers/prisma";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

describe("Organizations", () => {
  const app = setupTestSuite();
  let user: UserFakerReturnType;
  let TOKEN: string;

  beforeAll(async () => {
    user = await UserFaker.create({ role: Roles.ADMIN });
    TOKEN = await getToken(user);
  });

  it("/POST organizations", async () => {
    await request(app().getHttpServer())
      .post("/organizations")
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({
        path: "/test/path",
        url: "http://example.com",
        sigle: "TEST",
      })
      .expect(201);
  });

  it("/GET organizations", async () => {
    await request(app().getHttpServer())
      .get("/organizations")
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);
  });

  it("/GET organizations/:id", async () => {
    const organization = await OrganizationFaker.create();
    await request(app().getHttpServer())
      .get(`/organizations/${organization.id}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);
  });

  it("/PATCH organizations/:id", async () => {
    const organization = await OrganizationFaker.create();
    const organizationParent = await OrganizationFaker.create();
    await request(app().getHttpServer())
      .patch(`/organizations/${organization.id}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({ path: "/Updated/Organization", parentId: organizationParent.id })
      .expect(200);
  });

  it("/PATCH organizations/:id - attaches then detaches a business division", async () => {
    const organization = await OrganizationFaker.create();
    const division = await BusinessDivisionFaker.create();

    const attached = await request(app().getHttpServer())
      .patch(`/organizations/${organization.id}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({ businessDivisionId: division.id })
      .expect(200);
    expect(attached.body.businessDivisionId).toEqual(division.id);

    const fetched = await request(app().getHttpServer())
      .get(`/organizations/${organization.id}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);
    expect(fetched.body.businessDivision?.label).toEqual(division.label);

    const detached = await request(app().getHttpServer())
      .patch(`/organizations/${organization.id}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({ businessDivisionId: null })
      .expect(200);
    expect(detached.body.businessDivisionId).toBeNull();
  });

  it("/PATCH organizations/:id - rejects an unknown business division", async () => {
    const organization = await OrganizationFaker.create();
    await request(app().getHttpServer())
      .patch(`/organizations/${organization.id}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({ businessDivisionId: "00000000-0000-0000-0000-000000000000" })
      .expect(404);
  });
});

// Les écritures d'organisation sont réservées à l'admin global :
// - la suppression remet à NULL le `scopeOrganizationId` des utilisateurs qui l'ont pour périmètre
//   (FK `ON DELETE SET NULL`) : un admin scopé supprimant son périmètre deviendrait admin global ;
// - le périmètre est relu via le `path` de l'organisation de scope : le modifier l'élargirait.
describe("Organizations - écritures réservées à l'admin global", () => {
  const app = setupTestSuite();
  const prisma = getPrismaClient();
  let GLOBAL_ADMIN_TOKEN: string;
  let CONTRIBUTOR_TOKEN: string;

  beforeAll(async () => {
    const globalAdmin = await UserFaker.create({ role: Roles.ADMIN });
    const contributor = await UserFaker.create({ role: Roles.CONTRIBUTOR });
    GLOBAL_ADMIN_TOKEN = await getToken(globalAdmin);
    CONTRIBUTOR_TOKEN = await getToken(contributor);
  });

  async function createScopedUser(role: Roles, scopeOrganizationId: string) {
    const user = await UserFaker.create({ role });
    await user.update({
      scopeOrganization: { connect: { id: scopeOrganizationId } },
    });
    return { user, token: await getToken(user) };
  }

  it("un contributeur ne peut pas créer une organisation (403)", async () => {
    await request(app().getHttpServer())
      .post("/organizations")
      .set("Authorization", `Bearer ${CONTRIBUTOR_TOKEN}`)
      .send({ path: "/E2E/contributor-create" })
      .expect(403);
  });

  it("un admin scopé ne peut pas créer une organisation (403)", async () => {
    const scopeOrg = await OrganizationFaker.create();
    const { token } = await createScopedUser(Roles.ADMIN, scopeOrg.id);

    await request(app().getHttpServer())
      .post("/organizations")
      .set("Authorization", `Bearer ${token}`)
      .send({ path: "/E2E/scoped-admin-create" })
      .expect(403);
  });

  it("un contributeur ne peut pas modifier une organisation (403)", async () => {
    const organization = await OrganizationFaker.create();
    await request(app().getHttpServer())
      .patch(`/organizations/${organization.id}`)
      .set("Authorization", `Bearer ${CONTRIBUTOR_TOKEN}`)
      .send({ sigle: "HACK" })
      .expect(403);
  });

  it("un admin scopé ne peut pas élargir son périmètre en modifiant le path (403)", async () => {
    const scopeOrg = await OrganizationFaker.create();
    const { token } = await createScopedUser(Roles.ADMIN, scopeOrg.id);

    await request(app().getHttpServer())
      .patch(`/organizations/${scopeOrg.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ path: "/MI" })
      .expect(403);

    const reloaded = await prisma.organization.findUnique({
      where: { id: scopeOrg.id },
    });
    expect(reloaded?.path).toBe(scopeOrg.path);
  });

  it("un contributeur scopé ne peut pas modifier le path de son périmètre (403)", async () => {
    const scopeOrg = await OrganizationFaker.create();
    const { token } = await createScopedUser(Roles.CONTRIBUTOR, scopeOrg.id);

    await request(app().getHttpServer())
      .patch(`/organizations/${scopeOrg.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ path: "/MI" })
      .expect(403);
  });

  it("un admin global supprime une organisation (204)", async () => {
    const organization = await OrganizationFaker.create();
    await request(app().getHttpServer())
      .delete(`/organizations/${organization.id}`)
      .set("Authorization", `Bearer ${GLOBAL_ADMIN_TOKEN}`)
      .expect(204);
  });

  it("un contributeur ne peut pas supprimer une organisation (403)", async () => {
    const organization = await OrganizationFaker.create();
    await request(app().getHttpServer())
      .delete(`/organizations/${organization.id}`)
      .set("Authorization", `Bearer ${CONTRIBUTOR_TOKEN}`)
      .expect(403);

    expect(
      await prisma.organization.findUnique({ where: { id: organization.id } }),
    ).not.toBeNull();
  });

  it("un admin scopé ne peut pas supprimer son organisation de périmètre (403)", async () => {
    const scopeOrg = await OrganizationFaker.create();
    const { user, token } = await createScopedUser(Roles.ADMIN, scopeOrg.id);

    await request(app().getHttpServer())
      .delete(`/organizations/${scopeOrg.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(403);

    const reloaded = await prisma.user.findUnique({ where: { id: user.id } });
    expect(reloaded?.scopeOrganizationId).toBe(scopeOrg.id);
  });

  it("un admin scopé ne peut pas supprimer une autre organisation (403)", async () => {
    const scopeOrg = await OrganizationFaker.create();
    const otherOrg = await OrganizationFaker.create();
    const { token } = await createScopedUser(Roles.ADMIN, scopeOrg.id);

    await request(app().getHttpServer())
      .delete(`/organizations/${otherOrg.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(403);
  });

  it("GET /organizations/:id/scoped-admins ne liste que les admins scopés sur l'organisation", async () => {
    const scopeOrg = await OrganizationFaker.create();
    const otherOrg = await OrganizationFaker.create();
    const { user: scopedAdmin } = await createScopedUser(
      Roles.ADMIN,
      scopeOrg.id,
    );
    const { user: scopedContributor } = await createScopedUser(
      Roles.CONTRIBUTOR,
      scopeOrg.id,
    );
    const { user: otherScopedAdmin } = await createScopedUser(
      Roles.ADMIN,
      otherOrg.id,
    );

    const res = await request(app().getHttpServer())
      .get(`/organizations/${scopeOrg.id}/scoped-admins`)
      .set("Authorization", `Bearer ${GLOBAL_ADMIN_TOKEN}`)
      .expect(200);

    const ids = res.body.map((u: { id: string }) => u.id);
    expect(ids).toEqual([scopedAdmin.id]);
    expect(ids).not.toContain(scopedContributor.id);
    expect(ids).not.toContain(otherScopedAdmin.id);
    expect(res.body[0].email).toBe(scopedAdmin.email);
  });

  it("GET /organizations/:id/scoped-admins est refusé hors admin global (403)", async () => {
    const scopeOrg = await OrganizationFaker.create();
    const { token: scopedAdminToken } = await createScopedUser(
      Roles.ADMIN,
      scopeOrg.id,
    );

    for (const token of [scopedAdminToken, CONTRIBUTOR_TOKEN]) {
      await request(app().getHttpServer())
        .get(`/organizations/${scopeOrg.id}/scoped-admins`)
        .set("Authorization", `Bearer ${token}`)
        .expect(403);
    }
  });

  it("GET /organizations/:id/scoped-admins renvoie 404 pour une organisation inconnue", async () => {
    await request(app().getHttpServer())
      .get("/organizations/00000000-0000-0000-0000-000000000000/scoped-admins")
      .set("Authorization", `Bearer ${GLOBAL_ADMIN_TOKEN}`)
      .expect(404);
  });

  it("la suppression par un admin global retire le périmètre des admins scopés (comportement assumé)", async () => {
    const scopeOrg = await OrganizationFaker.create();
    const { user } = await createScopedUser(Roles.ADMIN, scopeOrg.id);

    await request(app().getHttpServer())
      .delete(`/organizations/${scopeOrg.id}`)
      .set("Authorization", `Bearer ${GLOBAL_ADMIN_TOKEN}`)
      .expect(204);

    const reloaded = await prisma.user.findUnique({ where: { id: user.id } });
    expect(reloaded?.scopeOrganizationId).toBeNull();
  });
});

describe("Organizations - MAIA references", () => {
  const app = setupTestSuite();
  let TOKEN: string;

  beforeAll(async () => {
    const user = await UserFaker.create({ role: Roles.ADMIN });
    TOKEN = await getToken(user);
  });

  it("POST /organization-maia-references creates a reference", async () => {
    const org = await OrganizationFaker.create();
    const maiaRef = `MI/TEST/${Date.now()}`;

    const res = await request(app().getHttpServer())
      .post("/organization-maia-references")
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({ maiaRef, organizationId: org.id })
      .expect(201);

    expect(res.body.maiaRef).toBe(maiaRef);
    expect(res.body.organizationId).toBe(org.id);
  });

  it("GET /organization-maia-references lists references (including N:1)", async () => {
    const org = await OrganizationFaker.create();
    const suffix = Date.now();

    await request(app().getHttpServer())
      .post("/organization-maia-references")
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({
        maiaRef: `MI/DNUM/SDID-${suffix}`,
        organizationId: org.id,
      })
      .expect(201);

    await request(app().getHttpServer())
      .post("/organization-maia-references")
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({
        maiaRef: `MI/DNUM/SDAN-${suffix}`,
        organizationId: org.id,
      })
      .expect(201);

    const res = await request(app().getHttpServer())
      .get(`/organization-maia-references?organizationId=${org.id}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    const refs = res.body.results.map((m: { maiaRef: string }) => m.maiaRef);
    expect(refs).toContain(`MI/DNUM/SDID-${suffix}`);
    expect(refs).toContain(`MI/DNUM/SDAN-${suffix}`);

    const orgRes = await request(app().getHttpServer())
      .get(`/organizations/${org.id}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    expect(Array.isArray(orgRes.body.maiaReferences)).toBe(true);
    expect(
      orgRes.body.maiaReferences.map((r: { maiaRef: string }) => r.maiaRef),
    ).toEqual(
      expect.arrayContaining([
        `MI/DNUM/SDID-${suffix}`,
        `MI/DNUM/SDAN-${suffix}`,
      ]),
    );
  });

  it("POST /organization-maia-references returns 409 on duplicate maiaRef", async () => {
    const org1 = await OrganizationFaker.create();
    const org2 = await OrganizationFaker.create();
    const maiaRef = `MI/DUPLICATE/${Date.now()}`;

    await request(app().getHttpServer())
      .post("/organization-maia-references")
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({ maiaRef, organizationId: org1.id })
      .expect(201);

    await request(app().getHttpServer())
      .post("/organization-maia-references")
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({ maiaRef, organizationId: org2.id })
      .expect(409);
  });

  it("DELETE /organization-maia-references/:id removes the reference", async () => {
    const org = await OrganizationFaker.create();
    const maiaRef = `MI/DELETE/${Date.now()}`;

    const createRes = await request(app().getHttpServer())
      .post("/organization-maia-references")
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({ maiaRef, organizationId: org.id })
      .expect(201);

    await request(app().getHttpServer())
      .delete(`/organization-maia-references/${createRes.body.id}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(204);

    const res = await request(app().getHttpServer())
      .get(`/organization-maia-references?organizationId=${org.id}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    expect(
      res.body.results.map((m: { maiaRef: string }) => m.maiaRef),
    ).not.toContain(maiaRef);
  });
});
