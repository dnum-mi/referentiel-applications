import { randomUUID } from "node:crypto";
import { Roles, ServiceTokenMode, TokenStatus } from "@prisma/client";
import request from "supertest";
import type { ExposedTokenDto } from "src/token/dto/token.dto";
import { getPrismaClient } from "./fakers/prisma";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

const API_KEY_HEADER = "x-refapp-token";

describe("Régénération des jetons — échéance et renouvellement effectif (#2926)", () => {
  const app = setupTestSuite();
  const prisma = getPrismaClient();

  async function createToken(
    serviceMode: ServiceTokenMode = ServiceTokenMode.machine,
  ) {
    // Un créateur par fixture laisse chaque scénario indépendant de la limite de jetons.
    const admin = await UserFaker.create({ role: Roles.ADMIN });
    const response = await request(app().getHttpServer())
      .post("/tokens")
      .set("Authorization", `Bearer ${getToken(admin)}`)
      .send({
        name: `regeneration-${randomUUID()}`,
        description: "Qualification du renouvellement de jeton",
        role: Roles.ADMIN,
        serviceMode,
        expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      })
      .expect(201);
    return { admin, token: response.body as ExposedTokenDto };
  }

  function regenerate(id: string, admin: { email: string }, expiresAt: string) {
    return request(app().getHttpServer())
      .post(`/tokens/${id}/regenerate`)
      .set("Authorization", `Bearer ${getToken(admin)}`)
      .send({ expiresAt });
  }

  const validStates = [TokenStatus.active, TokenStatus.expired].flatMap(
    (status) =>
      Object.values(ServiceTokenMode).map((serviceMode) => ({
        status,
        serviceMode,
      })),
  );
  it.each(validStates)(
    "renouvelle un jeton $serviceMode $status, rend le nouveau secret utilisable et invalide l'ancien",
    async ({ status, serviceMode }) => {
      const { admin, token } = await createToken(serviceMode);
      if (status === TokenStatus.expired) {
        await prisma.token.update({
          where: { id: token.id },
          data: { status, expiresAt: new Date(Date.now() - 3_600_000) },
        });
      }
      const before = await prisma.token.findUniqueOrThrow({
        where: { id: token.id },
      });
      const expiresAt = new Date(Date.now() + 7_200_000).toISOString();
      const response = await regenerate(token.id, admin, expiresAt).expect(201);
      const renewed = response.body as ExposedTokenDto;
      expect(renewed).toMatchObject({
        id: token.id,
        status: TokenStatus.active,
        serviceMode,
        expiresAt,
      });
      expect(typeof renewed.password).toBe("string");
      expect(renewed.password === token.password).toBe(false);
      const stored = await prisma.token.findUniqueOrThrow({
        where: { id: token.id },
      });
      expect(stored).toMatchObject({
        status: TokenStatus.active,
        expiresAt: new Date(expiresAt),
        serviceMode,
        userIdImpersonate: before.userIdImpersonate,
        createdById: before.createdById,
        role: before.role,
      });
      // Les assertions booléennes ne divulguent pas de hash ou secret en cas d'échec.
      expect(stored.hash === before.hash).toBe(false);
      expect(stored.updatedAt.getTime()).toBeGreaterThanOrEqual(
        before.updatedAt.getTime(),
      );

      await request(app().getHttpServer())
        .get("/users/me")
        .set("Authorization", `Bearer ${getToken(admin)}`)
        .set(API_KEY_HEADER, token.password)
        .expect(401);
      const authenticated = await request(app().getHttpServer())
        .get("/users/me")
        .set("Authorization", `Bearer ${getToken(admin)}`)
        .set(API_KEY_HEADER, renewed.password)
        .expect(200);
      expect(authenticated.body.id).toBe(
        serviceMode === ServiceTokenMode.machine
          ? stored.userIdImpersonate
          : admin.id,
      );
      await request(app().getHttpServer())
        .get("/users/me")
        .set(API_KEY_HEADER, renewed.password)
        .expect(serviceMode === ServiceTokenMode.machine ? 200 : 401);
    },
  );

  it.each([
    ["passée", () => new Date(Date.now() - 60_000).toISOString()],
    ["présente", () => new Date().toISOString()],
    ["invalide", () => "date-invalide"],
    [
      "supérieure à un an",
      () => {
        const date = new Date();
        date.setFullYear(date.getFullYear() + 1);
        date.setDate(date.getDate() + 1);
        return date.toISOString();
      },
    ],
  ] as const)(
    "refuse une échéance %s sans changer le jeton ni émettre de secret",
    async (_label, expiration) => {
      const { admin, token } = await createToken();
      const before = await prisma.token.findUniqueOrThrow({
        where: { id: token.id },
      });
      const response = await regenerate(token.id, admin, expiration()).expect(
        400,
      );
      expect(response.body).not.toHaveProperty("password");
      const after = await prisma.token.findUniqueOrThrow({
        where: { id: token.id },
      });
      expect(after.hash === before.hash).toBe(true);
      expect(after.expiresAt).toEqual(before.expiresAt);
      expect(after.updatedAt).toEqual(before.updatedAt);
      expect(after.status).toBe(before.status);
      await request(app().getHttpServer())
        .get("/users/me")
        .set(API_KEY_HEADER, token.password)
        .expect(200);
    },
  );

  it("accepte une échéance à un an calendaire", async () => {
    const { admin, token } = await createToken();
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    const response = await regenerate(
      token.id,
      admin,
      date.toISOString(),
    ).expect(201);
    expect(response.body.expiresAt).toBe(date.toISOString());
    expect(response.body.status).toBe(TokenStatus.active);
  });

  it("ne réactive jamais un jeton révoqué", async () => {
    const { admin, token } = await createToken();
    await request(app().getHttpServer())
      .delete(`/tokens/${token.id}`)
      .set("Authorization", `Bearer ${getToken(admin)}`)
      .expect(204);
    const before = await prisma.token.findUniqueOrThrow({
      where: { id: token.id },
    });
    const response = await regenerate(
      token.id,
      admin,
      new Date(Date.now() + 7_200_000).toISOString(),
    ).expect(404);
    expect(response.body).not.toHaveProperty("password");
    const after = await prisma.token.findUniqueOrThrow({
      where: { id: token.id },
    });
    expect(after.hash === before.hash).toBe(true);
    expect(after.expiresAt).toEqual(before.expiresAt);
    expect(after.updatedAt).toEqual(before.updatedAt);
    expect(after.status).toBe(TokenStatus.revoked);
    await request(app().getHttpServer())
      .get("/users/me")
      .set(API_KEY_HEADER, token.password)
      .expect(401);
  });

  it("ne réactive pas un jeton révoqué pendant que sa régénération attend l’écriture", async () => {
    const { admin, token } = await createToken();
    const before = await prisma.token.findUniqueOrThrow({
      where: { id: token.id },
    });
    let regeneration: Promise<request.Response> | undefined;
    // Une transaction indépendante verrouille la ligne. La lecture initiale du service reste
    // possible (MVCC), mais son UPDATE doit attendre la révocation et son commit.
    await prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT id FROM "Token" WHERE id = ${token.id} FOR UPDATE`;
      const [{ pid }] = await transaction.$queryRaw<
        { pid: number }[]
      >`SELECT pg_backend_pid() AS pid`;
      regeneration = regenerate(
        token.id,
        admin,
        new Date(Date.now() + 7_200_000).toISOString(),
      ).then((response) => response);
      let blocked = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        const [state] = await prisma.$queryRaw<{ blocked: boolean }[]>`
          SELECT EXISTS (
            SELECT 1 FROM pg_stat_activity WHERE ${pid} = ANY(pg_blocking_pids(pid))
          ) AS blocked
        `;
        if (state.blocked) {
          blocked = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      expect(blocked).toBe(true);
      await transaction.token.update({
        where: { id: token.id },
        data: { status: TokenStatus.revoked },
      });
    });
    const response = await regeneration;
    expect(response?.status).toBe(404);
    expect(response?.body).not.toHaveProperty("password");
    const after = await prisma.token.findUniqueOrThrow({
      where: { id: token.id },
    });
    expect(after.status).toBe(TokenStatus.revoked);
    expect(after.hash === before.hash).toBe(true);
    expect(after.expiresAt).toEqual(before.expiresAt);
    await request(app().getHttpServer())
      .get("/users/me")
      .set(API_KEY_HEADER, token.password)
      .expect(401);
  });

  it.each(["lecteur", "bot", "délégué", "impersonation"] as const)(
    "refuse la régénération au contexte %s sans modifier le jeton",
    async (context) => {
      const { admin, token } = await createToken();
      const before = await prisma.token.findUniqueOrThrow({
        where: { id: token.id },
      });
      const call = request(app().getHttpServer())
        .post(`/tokens/${token.id}/regenerate`)
        .send({ expiresAt: new Date(Date.now() + 7_200_000).toISOString() });
      if (context === "lecteur") {
        const reader = await UserFaker.create({ role: Roles.READER });
        call.set("Authorization", `Bearer ${getToken(reader)}`);
      } else if (context === "bot") {
        call.set(API_KEY_HEADER, token.password);
      } else if (context === "délégué") {
        const delegated = await createToken(ServiceTokenMode.delegated);
        call
          .set(API_KEY_HEADER, delegated.token.password)
          .set("Authorization", `Bearer ${getToken(admin)}`);
      } else {
        const targetAdmin = await UserFaker.create({ role: Roles.ADMIN });
        call
          .set("Authorization", `Bearer ${getToken(admin)}`)
          .set("x-impersonate-user-id", targetAdmin.id);
      }
      const response = await call.expect(403);
      expect(response.body).not.toHaveProperty("password");
      const after = await prisma.token.findUniqueOrThrow({
        where: { id: token.id },
      });
      expect(after.hash === before.hash).toBe(true);
      expect(after.expiresAt).toEqual(before.expiresAt);
      expect(after.updatedAt).toEqual(before.updatedAt);
      expect(after.status).toBe(before.status);
    },
  );
});
