import type { UserFakerReturnType } from "./fakers/user.faker";
import { Roles } from "@prisma/client";
import request from "supertest";
import { OrganizationFaker } from "./fakers/organization.faker";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

describe("GET /users — filtrage de la liste par périmètre (#2230)", () => {
  const app = setupTestSuite();
  const suffix = Date.now();

  let globalAdmin: UserFakerReturnType;
  let scopedAdmin: UserFakerReturnType;
  let targetInScope: UserFakerReturnType;
  let targetOutOfScope: UserFakerReturnType;
  let targetWithoutOrganization: UserFakerReturnType;
  let GLOBAL_ADMIN_TOKEN: string;
  let SCOPED_ADMIN_TOKEN: string;

  beforeAll(async () => {
    const scopeOrg = await OrganizationFaker.create({
      path: `E2E/LIST/DTNUM-${suffix}`,
    });
    const inScopeOrg = await OrganizationFaker.create({
      path: `E2E/LIST/DTNUM-${suffix}/SDAN`,
    });
    const outOfScopeOrg = await OrganizationFaker.create({
      path: `E2E/LIST/DGPN-${suffix}`,
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

    // Utilisateur sans organisation : doit rester visible pour un admin global,
    // mais être exclu de la liste d'un admin local (décision actée sur #2230).
    targetWithoutOrganization = await UserFaker.create({ role: Roles.VISITOR });

    GLOBAL_ADMIN_TOKEN = await getToken(globalAdmin);
    SCOPED_ADMIN_TOKEN = await getToken(scopedAdmin);
  });

  it("a global admin sees every user, including those without an organization", async () => {
    const response = await request(app().getHttpServer())
      .get("/users")
      .set("Authorization", `Bearer ${GLOBAL_ADMIN_TOKEN}`)
      .expect(200);

    const ids = response.body.results.map((user: { id: string }) => user.id);
    expect(ids).toContain(targetInScope.id);
    expect(ids).toContain(targetOutOfScope.id);
    expect(ids).toContain(targetWithoutOrganization.id);
  });

  it("a scoped admin only sees users within their scope", async () => {
    const response = await request(app().getHttpServer())
      .get("/users")
      .set("Authorization", `Bearer ${SCOPED_ADMIN_TOKEN}`)
      .expect(200);

    const ids = response.body.results.map((user: { id: string }) => user.id);
    expect(ids).toContain(targetInScope.id);
    expect(ids).not.toContain(targetOutOfScope.id);
  });

  it("a scoped admin does not see users without an organization", async () => {
    const response = await request(app().getHttpServer())
      .get("/users")
      .set("Authorization", `Bearer ${SCOPED_ADMIN_TOKEN}`)
      .expect(200);

    const ids = response.body.results.map((user: { id: string }) => user.id);
    expect(ids).not.toContain(targetWithoutOrganization.id);
  });

  it("the pagination total reflects the scoped filter, not the global count", async () => {
    const [globalResponse, scopedResponse] = await Promise.all([
      request(app().getHttpServer())
        .get("/users")
        .set("Authorization", `Bearer ${GLOBAL_ADMIN_TOKEN}`)
        .expect(200),
      request(app().getHttpServer())
        .get("/users")
        .set("Authorization", `Bearer ${SCOPED_ADMIN_TOKEN}`)
        .expect(200),
    ]);

    expect(scopedResponse.body.total).toBeLessThan(globalResponse.body.total);
  });
});
