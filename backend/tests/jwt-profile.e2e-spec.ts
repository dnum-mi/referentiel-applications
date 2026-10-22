import type { INestApplication } from "@nestjs/common";
import type { AddressInfo } from "node:net";
import type { UserFakerReturnType } from "./fakers/user.faker";
import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import { Test } from "@nestjs/testing";
import { AuthLevel, Roles, ServiceTokenMode, UserType } from "@prisma/client";
import { decodeJwt, exportJWK, generateKeyPair, SignJWT } from "jose";
import request from "supertest";
import { AppModule } from "src/app.module";
import { UserinfoClaimsResolver } from "src/auth-level/userinfo-claims";
import { setupGlobalValidation } from "src/config/app-config";
import {
  authLevelConfig,
  jwtValidationConfig,
  oidcConfig,
} from "src/config/configs";
import type { AuthLevelConfig } from "src/config/configs/auth-level.config";
import type { OidcConfig } from "src/config/configs/oidc.config";
import { UserConnexionLogService } from "src/user/user-connexion-log.service";
import { UserService } from "src/user/user.service";
import { getPrismaClient } from "./fakers/prisma";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";

type Channel = "direct" | "delegated";
type Claims = Record<string, unknown>;
const API_AUDIENCE = "refapp-api";
const OTHER_API_AUDIENCE = "refapp-audit-api";
const FRONTEND_CLIENT_ID = "refapp-browser-client";

const invalidProfiles: { label: string; mutate: (claims: Claims) => void }[] = [
  {
    label: "issuer absent",
    mutate: (claims) => {
      delete claims.iss;
    },
  },
  {
    label: "issuer étranger malgré la même clé",
    mutate: (claims) => {
      claims.iss = "https://another-issuer.example.test";
    },
  },
  {
    label: "audience absente",
    mutate: (claims) => {
      delete claims.aud;
    },
  },
  {
    label: "audience étrangère malgré un azp valide",
    mutate: (claims) => {
      claims.aud = "another-api";
      claims.azp = FRONTEND_CLIENT_ID;
    },
  },
  {
    label: "client frontend seul dans aud",
    mutate: (claims) => {
      claims.aud = FRONTEND_CLIENT_ID;
    },
  },
  {
    label: "expiration absente",
    mutate: (claims) => {
      delete claims.exp;
    },
  },
  {
    label: "expiration passée",
    mutate: (claims) => {
      claims.exp = Math.floor(Date.now() / 1000) - 300;
    },
  },
  {
    label: "expiration de type chaîne",
    mutate: (claims) => {
      claims.exp = "tomorrow";
    },
  },
  {
    label: "subject absent",
    mutate: (claims) => {
      delete claims.sub;
    },
  },
  {
    label: "subject vide",
    mutate: (claims) => {
      claims.sub = "";
    },
  },
  {
    label: "subject blanc",
    mutate: (claims) => {
      claims.sub = "   ";
    },
  },
  {
    label: "subject de type nombre",
    mutate: (claims) => {
      claims.sub = 42;
    },
  },
  {
    label: "email absent",
    mutate: (claims) => {
      delete claims.email;
    },
  },
  {
    label: "email vide",
    mutate: (claims) => {
      claims.email = "";
    },
  },
  {
    label: "email blanc",
    mutate: (claims) => {
      claims.email = "   ";
    },
  },
  {
    label: "email de type nombre",
    mutate: (claims) => {
      claims.email = 42;
    },
  },
  {
    label: "email null",
    mutate: (claims) => {
      claims.email = null;
    },
  },
  {
    label: "nbf dans le futur",
    mutate: (claims) => {
      claims.nbf = Math.floor(Date.now() / 1000) + 600;
    },
  },
];

/**
 * Vrais JWT RS256, clés privées éphémères et JWKS HTTP local. Cette suite construit
 * AppModule directement : setupApp() conserve son bypass explicite pour les autres
 * fixtures, sans neutraliser la vérification de signature ou de claims ici.
 */
describe("Profil JWT vérifié — HTTP direct et délégué (#2924)", () => {
  const prisma = getPrismaClient();
  const prefix = `jwt-profile-${randomUUID()}`;
  const subject = `opaque-idp-subject-${randomUUID()}`;
  let app: INestApplication;
  let server: Server;
  let issuer: string;
  let userinfoCalls = 0;
  let trustedKey: Awaited<ReturnType<typeof generateKeyPair>>["privateKey"];
  let untrustedKey: Awaited<ReturnType<typeof generateKeyPair>>["privateKey"];
  let human: UserFakerReturnType;
  let serviceSecret: string;
  let machineSecret: string;
  let machineUserId: string;

  function validClaims({ strong = true }: { strong?: boolean } = {}): Claims {
    return {
      iss: issuer,
      aud: API_AUDIENCE,
      exp: Math.floor(Date.now() / 1000) + 3600,
      sub: subject,
      email: human.email,
      ...(strong ? { auth_mode: "CARD" } : {}),
    };
  }

  function sign(claims: Claims, privateKey = trustedKey) {
    return new SignJWT(claims)
      .setProtectedHeader({ alg: "RS256", kid: "trusted-idp-key" })
      .sign(privateKey);
  }

  function profile(token: string, channel: Channel) {
    const call = request(app.getHttpServer())
      .get("/users/me")
      .set("Authorization", `Bearer ${token}`);
    return channel === "delegated"
      ? call.set("x-refapp-token", serviceSecret)
      : call;
  }

  async function expectRejectedBeforeIdentityResolution(
    token: string,
    channel: Channel,
  ) {
    const users = app.get(UserService);
    const create = jest.spyOn(users, "findOrCreateByEmail");
    const find = jest.spyOn(users, "findByEmailWithRelations");
    const userinfo = jest.spyOn(UserinfoClaimsResolver.prototype, "resolve");
    const log = jest.spyOn(app.get(UserConnexionLogService), "log");
    const callsBefore = userinfoCalls;
    const usersBefore = await prisma.user.count({
      where: { email: { startsWith: prefix } },
    });
    const logsBefore = await prisma.userConnexionLog.count({
      where: { userId: human.id },
    });
    try {
      const response = await profile(token, channel).expect(401);
      expect(response.body).not.toHaveProperty("id");
      expect(response.body).not.toHaveProperty("email");
      expect(response.body).not.toHaveProperty("strongAuthRequired");
      expect(create).not.toHaveBeenCalled();
      expect(find).not.toHaveBeenCalled();
      expect(userinfo).not.toHaveBeenCalled();
      expect(log).not.toHaveBeenCalled();
      expect(userinfoCalls).toBe(callsBefore);
      expect(
        await prisma.user.count({ where: { email: { startsWith: prefix } } }),
      ).toBe(usersBefore);
      expect(
        await prisma.userConnexionLog.count({ where: { userId: human.id } }),
      ).toBe(logsBefore);
    } finally {
      create.mockRestore();
      find.mockRestore();
      userinfo.mockRestore();
      log.mockRestore();
    }
  }

  beforeAll(async () => {
    const [trusted, untrusted] = await Promise.all([
      generateKeyPair("RS256"),
      generateKeyPair("RS256"),
    ]);
    trustedKey = trusted.privateKey;
    untrustedKey = untrusted.privateKey;
    const publicKey = await exportJWK(trusted.publicKey);
    server = createServer((req, res) => {
      res.setHeader("content-type", "application/json");
      if (req.url === "/jwks") {
        res.end(
          JSON.stringify({
            keys: [
              {
                ...publicKey,
                kid: "trusted-idp-key",
                alg: "RS256",
                use: "sig",
              },
            ],
          }),
        );
        return;
      }
      if (req.url === "/userinfo") {
        userinfoCalls++;
        try {
          const token = (req.headers.authorization ?? "").replace(
            /^Bearer\s+/i,
            "",
          );
          const payload = decodeJwt(token);
          res.end(JSON.stringify({ sub: payload.sub, auth_mode: "CARD" }));
        } catch {
          res.statusCode = 401;
          res.end(JSON.stringify({ error: "invalid_token" }));
        }
        return;
      }
      res.statusCode = 404;
      res.end(JSON.stringify({ error: "not_found" }));
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    issuer = `${origin}/trusted-issuer`;
    const oidc: OidcConfig = {
      issuer,
      audiences: [API_AUDIENCE, OTHER_API_AUDIENCE],
      jwksUrl: `${origin}/jwks`,
      configUrl: `${origin}/.well-known/openid-configuration`,
      clientId: FRONTEND_CLIENT_ID,
      scope: "openid profile email",
    };
    const authLevel: AuthLevelConfig = {
      mode: "enforce",
      claim: "auth_mode",
      strongValues: ["card"],
      trustedIdps: [],
      reauth: { enabled: true, strategy: "prompt", prompt: "login" },
      userinfo: { enabled: true, url: `${origin}/userinfo`, timeoutMs: 2000 },
    };
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(jwtValidationConfig.KEY)
      .useValue({ disabled: false })
      .overrideProvider(oidcConfig.KEY)
      .useValue(oidc)
      .overrideProvider(authLevelConfig.KEY)
      .useValue(authLevel)
      .compile();
    app = module.createNestApplication();
    setupGlobalValidation(app);
    await app.init();
    human = await UserFaker.create({
      email: `${prefix}-admin@example.test`,
      role: Roles.ADMIN,
    });

    for (const mode of [ServiceTokenMode.delegated, ServiceTokenMode.machine]) {
      const response = await request(app.getHttpServer())
        .post("/tokens")
        .set("Authorization", `Bearer ${await sign(validClaims())}`)
        .send({
          name: `${prefix}-${mode}`,
          description: "Service du test de profil JWT",
          role: Roles.READER,
          serviceMode: mode,
          expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
        })
        .expect(201);
      expect(typeof response.body.password).toBe("string");
      if (mode === ServiceTokenMode.delegated)
        serviceSecret = response.body.password;
      else {
        machineSecret = response.body.password;
        machineUserId = response.body.userImpersonate.id;
      }
    }
  });

  afterAll(async () => {
    try {
      await app?.close();
      await prisma.$disconnect();
    } finally {
      if (server?.listening)
        await new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        );
    }
  });

  describe.each(["direct", "delegated"] as const)("Canal %s", (channel) => {
    it("accepte le profil signé fort sans exiger iat et garde l'identité humaine par email", async () => {
      expect(subject).not.toBe(human.id);
      expect(subject).not.toBe(human.email);
      const response = await profile(await sign(validClaims()), channel).expect(
        200,
      );
      expect(response.body).toMatchObject({
        id: human.id,
        email: human.email,
        type: UserType.human,
        role: channel === "direct" ? Roles.ADMIN : Roles.READER,
        authLevel: { level: AuthLevel.strong, downgraded: false },
      });
    });

    it("accepte au moins une audience API autorisée dans un tableau multi-audiences", async () => {
      const token = await sign({
        ...validClaims(),
        aud: ["unrelated-api", OTHER_API_AUDIENCE],
      });
      const response = await profile(token, channel).expect(200);
      expect(response.body.id).toBe(human.id);
    });

    it("conserve le refus 403 d'une session faible dont le profil JWT est valide", async () => {
      const token = await sign({ ...validClaims(), auth_mode: "PASSWORD" });
      const response = await profile(token, channel).expect(403);
      expect(response.body).toMatchObject({
        strongAuthRequired: true,
        authLevel: { level: AuthLevel.weak, downgraded: true },
      });
    });

    it("conserve le repli userinfo pour un JWT valide sans claim de mode", async () => {
      const before = userinfoCalls;
      const token = await sign({
        ...validClaims({ strong: false }),
        jti: randomUUID(),
      });
      const response = await profile(token, channel).expect(200);
      expect(response.body.authLevel).toMatchObject({
        level: AuthLevel.strong,
        downgraded: false,
      });
      expect(userinfoCalls).toBe(before + 1);
    });

    it.each(invalidProfiles)(
      "refuse $label avant userinfo, résolution utilisateur et journal de connexion",
      async ({ mutate }) => {
        // Sans auth_mode, une validation erronée atteindrait effectivement userinfo.
        const claims = validClaims({ strong: false });
        mutate(claims);
        await expectRejectedBeforeIdentityResolution(
          await sign(claims),
          channel,
        );
      },
    );

    it.each(["issuer", "audience"] as const)(
      "un claim fort CARD ne rend pas acceptable un mauvais %s",
      async (claim) => {
        const claims = validClaims();
        if (claim === "issuer")
          claims.iss = "https://another-issuer.example.test";
        else claims.aud = "another-api";
        await expectRejectedBeforeIdentityResolution(
          await sign(claims),
          channel,
        );
      },
    );

    it("refuse une signature forgée même lorsque tous les claims sont valides", async () => {
      await expectRejectedBeforeIdentityResolution(
        await sign(validClaims(), untrustedKey),
        channel,
      );
    });

    it("refuse les fixtures non signées lorsque la vraie vérification est active", async () => {
      await expectRejectedBeforeIdentityResolution(
        getToken(human, validClaims()),
        channel,
      );
    });
  });

  it("un token machine reste autonome et n'est pas remplacé par le JWT humain invalide joint", async () => {
    const response = await request(app.getHttpServer())
      .get("/users/me")
      .set("x-refapp-token", machineSecret)
      .set(
        "Authorization",
        `Bearer ${await sign({ ...validClaims(), iss: "https://wrong.example.test" }, untrustedKey)}`,
      )
      .expect(200);
    expect(response.body).toMatchObject({
      id: machineUserId,
      type: UserType.bot,
      role: Roles.READER,
    });
    expect(response.body.id).not.toBe(human.id);
  });

  it("un service délégué n'inscrit pas un humain inconnu même avec un JWT valide", async () => {
    const email = `${prefix}-unknown@example.test`;
    const create = jest.spyOn(app.get(UserService), "findOrCreateByEmail");
    try {
      await profile(
        await sign({ ...validClaims(), sub: randomUUID(), email }),
        "delegated",
      ).expect(401);
      expect(create).not.toHaveBeenCalled();
      expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
    } finally {
      create.mockRestore();
    }
  });
});
