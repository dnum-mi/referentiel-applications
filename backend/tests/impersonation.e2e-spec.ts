import type { UserFakerReturnType } from "./fakers/user.faker";
import { Roles } from "@prisma/client";
import request from "supertest";
import { OrganizationFaker } from "./fakers/organization.faker";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

const IMPERSONATE_HEADER = "x-impersonate-user-id";

describe("Impersonation — contrôle de périmètre (#2217)", () => {
  const app = setupTestSuite();
  const suffix = Date.now();

  let globalAdmin: UserFakerReturnType;
  let scopedAdmin: UserFakerReturnType;
  let targetInScope: UserFakerReturnType;
  let targetOutOfScope: UserFakerReturnType;
  let GLOBAL_ADMIN_TOKEN: string;
  let SCOPED_ADMIN_TOKEN: string;

  beforeAll(async () => {
    const scopeOrg = await OrganizationFaker.create({
      path: `E2E/IMP/DTNUM-${suffix}`,
    });
    const inScopeOrg = await OrganizationFaker.create({
      path: `E2E/IMP/DTNUM-${suffix}/SDAN`,
    });
    const outOfScopeOrg = await OrganizationFaker.create({
      path: `E2E/IMP/DGPN-${suffix}`,
    });

    globalAdmin = await UserFaker.create({ role: Roles.ADMIN });

    scopedAdmin = await UserFaker.create({ role: Roles.ADMIN });
    await scopedAdmin.update({
      scopeOrganization: { connect: { id: scopeOrg.id } },
    });

    targetInScope = await UserFaker.create({ role: Roles.VISITOR });
    await targetInScope.update({
      organization: { connect: { id: inScopeOrg.id } },
    });

    targetOutOfScope = await UserFaker.create({ role: Roles.VISITOR });
    await targetOutOfScope.update({
      organization: { connect: { id: outOfScopeOrg.id } },
    });

    GLOBAL_ADMIN_TOKEN = await getToken(globalAdmin);
    SCOPED_ADMIN_TOKEN = await getToken(scopedAdmin);
  });

  it("POST /users/:id/impersonate - a global admin can impersonate anyone", async () => {
    const response = await request(app().getHttpServer())
      .post(`/users/${targetOutOfScope.id}/impersonate`)
      .set("Authorization", `Bearer ${GLOBAL_ADMIN_TOKEN}`)
      .expect(200);

    expect(response.body.id).toEqual(targetOutOfScope.id);
  });

  it("POST /users/:id/impersonate - a scoped admin can impersonate within their scope", async () => {
    const response = await request(app().getHttpServer())
      .post(`/users/${targetInScope.id}/impersonate`)
      .set("Authorization", `Bearer ${SCOPED_ADMIN_TOKEN}`)
      .expect(200);

    expect(response.body.id).toEqual(targetInScope.id);
  });

  it("POST /users/:id/impersonate - a scoped admin is rejected outside their scope", async () => {
    await request(app().getHttpServer())
      .post(`/users/${targetOutOfScope.id}/impersonate`)
      .set("Authorization", `Bearer ${SCOPED_ADMIN_TOKEN}`)
      .expect(403);
  });

  it("header direct - a scoped admin is served the in-scope identity", async () => {
    const response = await request(app().getHttpServer())
      .get("/users/me")
      .set("Authorization", `Bearer ${SCOPED_ADMIN_TOKEN}`)
      .set(IMPERSONATE_HEADER, targetInScope.id)
      .expect(200);

    expect(response.body.id).toEqual(targetInScope.id);
  });

  it("header direct - a scoped admin is rejected outside their scope even without the endpoint", async () => {
    // Le header peut être posé à la main sans passer par POST /users/:id/impersonate :
    // le middleware doit refuser lui-même l'identité hors périmètre.
    await request(app().getHttpServer())
      .get("/users/me")
      .set("Authorization", `Bearer ${SCOPED_ADMIN_TOKEN}`)
      .set(IMPERSONATE_HEADER, targetOutOfScope.id)
      .expect(403);
  });

  it("header direct - a non-admin cannot impersonate at all", async () => {
    const visitor = await UserFaker.create({ role: Roles.VISITOR });
    const VISITOR_TOKEN = await getToken(visitor);

    await request(app().getHttpServer())
      .get("/users/me")
      .set("Authorization", `Bearer ${VISITOR_TOKEN}`)
      .set(IMPERSONATE_HEADER, targetInScope.id)
      .expect(403);
  });
});
