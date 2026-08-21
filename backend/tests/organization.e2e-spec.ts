import type { UserFakerReturnType } from "./fakers/user.faker";
import { Roles } from "@prisma/client";
import request from "supertest";
import { BusinessDivisionFaker } from "./fakers/business-division.faker";
import { OrganizationFaker } from "./fakers/organization.faker";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

describe("Organizations", () => {
  const app = setupTestSuite();
  let user: UserFakerReturnType;
  let TOKEN: string;

  beforeAll(async () => {
    user = await UserFaker.create({ role: Roles.CONTRIBUTOR });
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

  it("/DELETE organizations/:id", async () => {
    const organization = await OrganizationFaker.create();
    await request(app().getHttpServer())
      .delete(`/organizations/${organization.id}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(204);
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

describe("Organizations - MAIA references", () => {
  const app = setupTestSuite();
  let TOKEN: string;

  beforeAll(async () => {
    const user = await UserFaker.create({ role: Roles.CONTRIBUTOR });
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
