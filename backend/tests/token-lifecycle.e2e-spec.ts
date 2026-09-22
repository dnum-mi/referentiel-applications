import { Roles, TokenStatus, UserType } from "@prisma/client";
import request from "supertest";
import type { ExposedTokenDto } from "src/token/dto/token.dto";
import { getPrismaClient } from "./fakers/prisma";
import type { UserFakerReturnType } from "./fakers/user.faker";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

const API_KEY_HEADER = "x-refapp-token";

describe("Administration et révocation des jetons API (#1988)", () => {
  const app = setupTestSuite();
  const prisma = getPrismaClient();
  const suffix = Date.now();
  let tokenSequence = 0;

  let admin: UserFakerReturnType;
  let otherAdmin: UserFakerReturnType;

  beforeAll(async () => {
    admin = await UserFaker.create({ role: Roles.ADMIN });
    otherAdmin = await UserFaker.create({ role: Roles.ADMIN });
  });

  function tokenData() {
    tokenSequence += 1;
    return {
      name: `e2e-lifecycle-${suffix}-${tokenSequence}`,
      description: "Vérification du cycle de vie des jetons API",
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    };
  }

  async function createServiceToken(creator = admin) {
    const response = await request(app().getHttpServer())
      .post("/tokens")
      .set("Authorization", `Bearer ${getToken(creator)}`)
      .send({ ...tokenData(), role: Roles.READER })
      .expect(201);

    return response.body as ExposedTokenDto;
  }

  async function createPersonalToken(owner: UserFakerReturnType) {
    const response = await request(app().getHttpServer())
      .post("/tokens/personal")
      .set("Authorization", `Bearer ${getToken(owner)}`)
      // Le rôle demandé ne doit jamais augmenter celui du propriétaire.
      .send({ ...tokenData(), role: Roles.ADMIN })
      .expect(201);

    expect(response.body).toMatchObject({
      kind: "personal",
      role: owner.role,
      userImpersonate: { id: owner.id },
    });
    return response.body as ExposedTokenDto;
  }

  it.each([Roles.VISITOR, Roles.READER, Roles.CONTRIBUTOR])(
    "refuse la délivrance d'un jeton de service à un %s",
    async (role) => {
      const user = await UserFaker.create({ role });
      const data = { ...tokenData(), role: Roles.ADMIN };

      await request(app().getHttpServer())
        .post("/tokens")
        .set("Authorization", `Bearer ${getToken(user)}`)
        .send(data)
        .expect(403);

      expect(
        await prisma.token.count({ where: { createdById: user.id } }),
      ).toBe(0);
    },
  );

  it("permet à un autre administrateur de révoquer un jeton de service et refuse immédiatement sa réutilisation", async () => {
    const token = await createServiceToken();
    expect(token).toMatchObject({
      kind: "service",
      role: Roles.READER,
      createdBy: { id: admin.id },
    });
    expect(token.password).toEqual(expect.any(String));
    const storedToken = await prisma.token.findUniqueOrThrow({
      where: { id: token.id },
      include: { userImpersonate: true },
    });
    expect(storedToken.userImpersonate.type).toBe(UserType.bot);
    expect(storedToken.userImpersonate.id).not.toBe(admin.id);

    await request(app().getHttpServer())
      .get("/users/me")
      .set("Authorization", `Bearer ${getToken(admin)}`)
      .set(API_KEY_HEADER, token.password)
      .expect(200);

    await request(app().getHttpServer())
      .delete(`/tokens/${token.id}`)
      .set("Authorization", `Bearer ${getToken(otherAdmin)}`)
      .expect(204);

    expect(
      await prisma.token.findUniqueOrThrow({ where: { id: token.id } }),
    ).toMatchObject({ status: TokenStatus.revoked });

    // Un JWT humain valide ne doit pas masquer la révocation du jeton tiers.
    await request(app().getHttpServer())
      .get("/users/me")
      .set("Authorization", `Bearer ${getToken(admin)}`)
      .set(API_KEY_HEADER, token.password)
      .expect(401);
  });

  it("refuse la révocation d'un jeton de service à son créateur devenu non administrateur, y compris par la route personnelle", async () => {
    const formerAdmin = await UserFaker.create({ role: Roles.ADMIN });
    const token = await createServiceToken(formerAdmin);
    await formerAdmin.update({ role: Roles.CONTRIBUTOR });

    for (const path of [
      `/tokens/${token.id}`,
      `/tokens/personal/${token.id}`,
    ]) {
      await request(app().getHttpServer())
        .delete(path)
        .set("Authorization", `Bearer ${getToken(formerAdmin)}`)
        .expect(404);
    }

    expect(
      await prisma.token.findUniqueOrThrow({ where: { id: token.id } }),
    ).toMatchObject({ status: TokenStatus.active });
  });

  it("réserve la régénération d'un jeton de service aux administrateurs et invalide son ancienne valeur", async () => {
    const token = await createServiceToken();
    const nonAdmin = await UserFaker.create({ role: Roles.READER });
    const expiresAt = new Date(Date.now() + 7_200_000).toISOString();

    await request(app().getHttpServer())
      .post(`/tokens/${token.id}/regenerate`)
      .set("Authorization", `Bearer ${getToken(nonAdmin)}`)
      .send({ expiresAt })
      .expect(403);

    const regenerated = await request(app().getHttpServer())
      .post(`/tokens/${token.id}/regenerate`)
      .set("Authorization", `Bearer ${getToken(otherAdmin)}`)
      .send({ expiresAt })
      .expect(201);
    const newToken = regenerated.body as ExposedTokenDto;
    expect(newToken.id).toBe(token.id);
    expect(newToken.password).not.toBe(token.password);

    await request(app().getHttpServer())
      .get("/users/me")
      .set("Authorization", `Bearer ${getToken(admin)}`)
      .set(API_KEY_HEADER, token.password)
      .expect(401);

    await request(app().getHttpServer())
      .get("/users/me")
      .set("Authorization", `Bearer ${getToken(admin)}`)
      .set(API_KEY_HEADER, newToken.password)
      .expect(200);
  });

  it("refuse de délivrer un jeton personnel à travers un jeton de service", async () => {
    const token = await createServiceToken();
    const data = tokenData();

    await request(app().getHttpServer())
      .post("/tokens/personal")
      .set("Authorization", `Bearer ${getToken(admin)}`)
      .set(API_KEY_HEADER, token.password)
      .send(data)
      .expect(403);

    expect(await prisma.token.count({ where: { name: data.name } })).toBe(0);
  });

  it.each(["/tokens", "/tokens/personal"])(
    "réserve la révocation personnelle au propriétaire ou à un administrateur via %s",
    async (path) => {
      const owner = await UserFaker.create({ role: Roles.CONTRIBUTOR });
      const stranger = await UserFaker.create({ role: Roles.CONTRIBUTOR });
      const token = await createPersonalToken(owner);

      await request(app().getHttpServer())
        .delete(`${path}/${token.id}`)
        .set("Authorization", `Bearer ${getToken(stranger)}`)
        .expect(404);
      expect(
        await prisma.token.findUniqueOrThrow({ where: { id: token.id } }),
      ).toMatchObject({ status: TokenStatus.active });

      await request(app().getHttpServer())
        .delete(`${path}/${token.id}`)
        .set("Authorization", `Bearer ${getToken(owner)}`)
        .expect(204);
      expect(
        await prisma.token.findUniqueOrThrow({ where: { id: token.id } }),
      ).toMatchObject({ status: TokenStatus.revoked });

      const otherToken = await createPersonalToken(owner);
      await request(app().getHttpServer())
        .delete(`${path}/${otherToken.id}`)
        .set("Authorization", `Bearer ${getToken(otherAdmin)}`)
        .expect(204);
      expect(
        await prisma.token.findUniqueOrThrow({ where: { id: otherToken.id } }),
      ).toMatchObject({ status: TokenStatus.revoked });
    },
  );
});
