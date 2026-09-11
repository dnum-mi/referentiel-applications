import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { AuthLevel, Roles } from "@prisma/client";
import request from "supertest";
import { getPrismaClient } from "./fakers/prisma";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

/**
 * #1985 — Repli userinfo, de bout en bout : le fournisseur ne place pas le claim de mode sur
 * l'access token mais le sert sur son endpoint userinfo. Un vrai serveur HTTP local joue ce rôle
 * (réponse selon le `sub` du jeton présenté), l'application Nest est la vraie.
 */
describe("Niveau d'authentification — repli userinfo (#1985)", () => {
  let server: Server;
  let userinfoCalls = 0;
  const userinfoBySub = new Map<string, Record<string, unknown>>();

  // Déclaré AVANT setupTestSuite : ce beforeAll s'exécute avant la création de l'application,
  // qui lit la configuration.
  beforeAll(async () => {
    server = createServer((req, res) => {
      userinfoCalls += 1;
      const token = (req.headers.authorization ?? "").replace(/^Bearer /, "");
      const payloadPart = token.split(".")[1] ?? "";
      const sub = payloadPart
        ? (
            JSON.parse(Buffer.from(payloadPart, "base64url").toString()) as {
              sub?: string;
            }
          ).sub
        : undefined;
      const claims = sub ? userinfoBySub.get(sub) : undefined;
      if (!claims) {
        res.writeHead(401, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "invalid_token" }));
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ sub, ...claims }));
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", () => resolve()),
    );
    const { port } = server.address() as AddressInfo;
    process.env.AUTH_LEVEL_MODE = "enforce";
    process.env.AUTH_LEVEL_CLAIM = "auth_mode";
    process.env.AUTH_LEVEL_STRONG_VALUES = "CARD";
    process.env.AUTH_LEVEL_IDP_CLAIM = "auth_idp";
    process.env.AUTH_LEVEL_USERINFO_FALLBACK = "true";
    process.env.AUTH_LEVEL_USERINFO_URL = `http://127.0.0.1:${port}/userinfo`;
  });

  afterAll(async () => {
    for (const name of [
      "AUTH_LEVEL_CLAIM",
      "AUTH_LEVEL_STRONG_VALUES",
      "AUTH_LEVEL_IDP_CLAIM",
      "AUTH_LEVEL_USERINFO_FALLBACK",
      "AUTH_LEVEL_USERINFO_URL",
    ]) {
      delete process.env[name];
    }
    process.env.AUTH_LEVEL_MODE = "off";
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const app = setupTestSuite();

  async function admin() {
    return UserFaker.create({ role: Roles.ADMIN });
  }

  it("accorde les droits pleins quand userinfo porte un mode fort", async () => {
    const user = await admin();
    userinfoBySub.set(user.email, { auth_mode: "CARD", auth_idp: "principal" });

    const res = await request(app().getHttpServer())
      .get("/users/me")
      .set("Authorization", `Bearer ${getToken(user)}`)
      .expect(200);

    expect(res.body).toMatchObject({
      role: Roles.ADMIN,
      authLevel: {
        level: AuthLevel.strong,
        downgraded: false,
        reason: "strong-method",
      },
    });
    const logs = await getPrismaClient().userConnexionLog.findMany({
      where: { userId: user.id },
    });
    expect(logs).toEqual([
      expect.objectContaining({
        authLevel: AuthLevel.strong,
        authMethod: "CARD",
        authIdp: "principal",
      }),
    ]);
  });

  it("rétrograde quand userinfo porte un mode faible", async () => {
    const user = await admin();
    userinfoBySub.set(user.email, { auth_mode: "PASSWORD" });

    const res = await request(app().getHttpServer())
      .get("/users/me")
      .set("Authorization", `Bearer ${getToken(user)}`)
      .expect(200);

    expect(res.body).toMatchObject({
      role: Roles.VISITOR,
      authLevel: { level: AuthLevel.weak, downgraded: true },
    });
  });

  // Fail-closed : un refus du fournisseur n'accorde jamais rien.
  it("reste faible quand userinfo refuse le jeton", async () => {
    const user = await admin();

    const res = await request(app().getHttpServer())
      .get("/users/me")
      .set("Authorization", `Bearer ${getToken(user)}`)
      .expect(200);

    expect(res.body).toMatchObject({
      role: Roles.VISITOR,
      authLevel: { reason: "claim-missing", downgraded: true },
    });
  });

  it("n'interroge userinfo qu'une fois par jeton", async () => {
    const user = await admin();
    userinfoBySub.set(user.email, { auth_mode: "CARD" });
    const token = getToken(user);
    const before = userinfoCalls;

    for (let i = 0; i < 3; i += 1) {
      await request(app().getHttpServer())
        .get("/users/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
    }

    expect(userinfoCalls - before).toBe(1);
  });

  it("n'interroge pas userinfo quand le jeton porte déjà le mode", async () => {
    const user = await admin();
    userinfoBySub.set(user.email, { auth_mode: "PASSWORD" });
    const before = userinfoCalls;

    const res = await request(app().getHttpServer())
      .get("/users/me")
      .set("Authorization", `Bearer ${getToken(user, { auth_mode: "CARD" })}`)
      .expect(200);

    expect(userinfoCalls).toBe(before);
    expect(res.body.authLevel.level).toBe(AuthLevel.strong);
  });

  it("sert la stratégie de reconnexion au front", async () => {
    const res = await request(app().getHttpServer()).get("/config").expect(200);
    expect(res.body.authLevel.reauth).toMatchObject({
      strategy: "prompt",
      prompt: "login",
    });
  });
});
