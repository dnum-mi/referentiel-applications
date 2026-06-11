import { Roles } from "@prisma/client";
import request from "supertest";
import { UserFaker } from "./fakers/user.faker";
import { OrganizationFaker } from "./fakers/organization.faker";
import { getPrismaClient } from "./fakers/prisma";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

describe("Users MAIA sync", () => {
  const app = setupTestSuite();
  const mockOrganizationPath = "/MI/TEST/MAIA";
  let token: string;
  let previousMockMaiaService: string | undefined;
  let previousMockMaiaOrganization: string | undefined;

  beforeAll(async () => {
    previousMockMaiaService = process.env.MOCK_MAIA_SERVICE;
    previousMockMaiaOrganization = process.env.MOCK_MAIA_ORGANIZATION;
    process.env.MOCK_MAIA_SERVICE = "true";
    process.env.MOCK_MAIA_ORGANIZATION = mockOrganizationPath;

    const adminUser = await UserFaker.create({ role: Roles.ADMIN });
    token = getToken(adminUser);
  });

  afterAll(() => {
    process.env.MOCK_MAIA_SERVICE = previousMockMaiaService;
    process.env.MOCK_MAIA_ORGANIZATION = previousMockMaiaOrganization;
  });

  it("/POST users/:id/sync-organization-from-maia", async () => {
    const user = await UserFaker.create();

    await request(app().getHttpServer())
      .post(`/users/${user.id}/sync-organization-from-maia`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
  });

  it("/POST users/sync-organizations-from-maia", async () => {
    await UserFaker.create();

    await request(app().getHttpServer())
      .post("/users/sync-organizations-from-maia")
      .set("Authorization", `Bearer ${token}`)
      .send({ onlyMissing: true })
      .expect(201);
  });

  it("sync uses MAIA reference when reference exists (nominal)", async () => {
    const prisma = getPrismaClient();
    const maiaRef = `/MI/TEST/REFERENCE-${Date.now()}`;
    const org = await OrganizationFaker.create();
    await prisma.organizationMaiaReference.create({
      data: { maiaRef, organizationId: org.id },
    });

    const user = await UserFaker.create();
    process.env.MOCK_MAIA_ORGANIZATION = maiaRef;

    await request(app().getHttpServer())
      .post(`/users/${user.id}/sync-organization-from-maia`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const updated = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    expect(updated.organizationId).toBe(org.id);

    await prisma.organizationMaiaReference.delete({ where: { maiaRef } });
  });

  it("sync falls back to Organization.path when no override exists", async () => {
    const prisma = getPrismaClient();
    const path = `/MI/TEST/LEGACY-${Date.now()}`;
    const org = await prisma.organization.create({ data: { path } });

    const user = await UserFaker.create();
    process.env.MOCK_MAIA_ORGANIZATION = path;

    await request(app().getHttpServer())
      .post(`/users/${user.id}/sync-organization-from-maia`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const updated = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    expect(updated.organizationId).toBe(org.id);

    const reference = await prisma.organizationMaiaReference.findUnique({
      where: { maiaRef: path },
    });
    expect(reference).toBeNull();

    await prisma.organization.delete({ where: { id: org.id } });
  });

  it("sync creates an organization without override when none exists", async () => {
    const prisma = getPrismaClient();
    const newPath = `/MI/TEST/NEW-${Date.now()}`;
    process.env.MOCK_MAIA_ORGANIZATION = newPath;

    const user = await UserFaker.create();

    await request(app().getHttpServer())
      .post(`/users/${user.id}/sync-organization-from-maia`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const updated = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    expect(updated.organizationId).not.toBeNull();

    const organizationId = updated.organizationId as string;
    expect(organizationId).not.toBeNull();

    const organization = await prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
    });
    expect(organization.path).toBe(newPath);

    const reference = await prisma.organizationMaiaReference.findUnique({
      where: { maiaRef: newPath },
    });
    expect(reference).toBeNull();
  });
});
