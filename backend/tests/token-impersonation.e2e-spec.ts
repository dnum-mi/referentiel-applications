import { createHash } from "node:crypto";
import { Roles, TokenStatus } from "@prisma/client";
import request from "supertest";
import { getPrismaClient } from "./fakers/prisma";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

const API_KEY_HEADER = "x-refapp-token";
const IMPERSONATE_HEADER = "x-impersonate-user-id";
const sha512 = (v: string) => createHash("sha512").update(v).digest("hex");

/**
 * #2372 — L'impersonation n'était censée être ouverte qu'à l'authentification humaine par JWT, pas
 * aux tokens API. Mais le middleware testait la simple présence du header `Authorization`, jamais la
 * méthode d'authentification réellement employée : un porteur de token API pouvait ajouter un
 * `Authorization` bidon (jamais décodé) pour satisfaire la condition et impersonner. On vérifie, sur
 * une vraie base, que l'identité effective reste celle du token — pas celle de la cible.
 */
describe("Impersonation refusée aux tokens API (#2372)", () => {
  const app = setupTestSuite();
  const prisma = getPrismaClient();
  const suffix = Date.now();

  let owner: Awaited<ReturnType<typeof UserFaker.create>>;
  let victim: Awaited<ReturnType<typeof UserFaker.create>>;
  const clearToken = `e2e-token-${suffix}`;

  beforeAll(async () => {
    owner = await UserFaker.create({ role: Roles.ADMIN });
    victim = await UserFaker.create({ role: Roles.ADMIN });

    await prisma.token.create({
      data: {
        name: `e2e-${suffix}`,
        description: "e2e token impersonation guard",
        role: Roles.ADMIN,
        hash: sha512(clearToken),
        expiresAt: new Date(Date.now() + 3_600_000),
        status: TokenStatus.active,
        userIdImpersonate: owner.id,
        createdById: owner.id,
      },
    });
  });

  it("un token API + header Authorization bidon + header d'impersonation ne change PAS l'identité", async () => {
    const res = await request(app().getHttpServer())
      .get("/users/me")
      .set(API_KEY_HEADER, clearToken)
      .set("Authorization", "Bearer forged-does-not-matter")
      .set(IMPERSONATE_HEADER, victim.id);

    expect(res.status).toBe(200);
    // L'identité effective est celle du token (owner), jamais la cible (victim).
    expect(res.body.id).toBe(owner.id);
    expect(res.body.id).not.toBe(victim.id);
  });

  it("l'authentification JWT humaine peut toujours impersonner (non-régression)", async () => {
    const res = await request(app().getHttpServer())
      .get("/users/me")
      .set("Authorization", `Bearer ${await getToken(owner)}`)
      .set(IMPERSONATE_HEADER, victim.id);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(victim.id);
  });
});
