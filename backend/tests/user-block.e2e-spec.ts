import { Roles } from "@prisma/client";
import request from "supertest";
import { UserFaker } from "./fakers/user.faker";
import { getPrismaClient } from "./fakers/prisma";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

describe("User blocking", () => {
  const app = setupTestSuite();
  let adminToken: string;

  beforeAll(async () => {
    const adminUser = await UserFaker.create({ role: Roles.ADMIN });
    adminToken = getToken(adminUser);
  });

  it("/POST users/:id/block then /POST users/:id/unblock", async () => {
    const target = await UserFaker.create();

    const blockResponse = await request(app().getHttpServer())
      .post(`/users/${target.id}/block`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(blockResponse.body.isBlocked).toBe(true);

    const prisma = getPrismaClient();
    const blocked = await prisma.user.findUniqueOrThrow({
      where: { id: target.id },
    });
    expect(blocked.isBlocked).toBe(true);
    expect(blocked.blockedAt).not.toBeNull();

    const unblockResponse = await request(app().getHttpServer())
      .post(`/users/${target.id}/unblock`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(unblockResponse.body.isBlocked).toBe(false);

    const unblocked = await prisma.user.findUniqueOrThrow({
      where: { id: target.id },
    });
    expect(unblocked.isBlocked).toBe(false);
    expect(unblocked.blockedAt).toBeNull();
  });

  it("a blocked user is rejected at authentication with 403", async () => {
    const target = await UserFaker.create();
    await request(app().getHttpServer())
      .post(`/users/${target.id}/block`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    const targetToken = getToken(target);
    const response = await request(app().getHttpServer())
      .get("/users/me")
      .set("Authorization", `Bearer ${targetToken}`)
      .expect(403);
    expect(response.body.blocked).toBe(true);
  });

  it("an admin cannot block their own access", async () => {
    const admin = await UserFaker.create({ role: Roles.ADMIN });
    const token = getToken(admin);

    await request(app().getHttpServer())
      .post(`/users/${admin.id}/block`)
      .set("Authorization", `Bearer ${token}`)
      .expect(400);
  });

  it("blocking is rejected for non-admin requestors", async () => {
    const requester = await UserFaker.create({ role: Roles.READER });
    const target = await UserFaker.create();
    const token = getToken(requester);

    await request(app().getHttpServer())
      .post(`/users/${target.id}/block`)
      .set("Authorization", `Bearer ${token}`)
      .expect(403);
  });
});
