import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
  UnsecuredJWT,
  type JWTPayload,
} from "jose";
import { UserinfoClaimsResolver } from "./userinfo-claims";
import { createUserinfoJwtVerifier } from "./userinfo-jwt-verifier";

const secret = "userinfo-test-secret-not-for-deployment-".repeat(2);
const key = new TextEncoder().encode(secret);
const claims = {
  sub: "agent-1",
  iss: "https://idp.example",
  aud: "refapp",
  auth_mode: "CARD",
};
const sign = (
  payload: JWTPayload = claims,
  algorithm = "HS256",
  signingKey = key,
) =>
  new SignJWT(payload)
    .setProtectedHeader({ alg: algorithm })
    .setExpirationTime("1m")
    .sign(signingKey);

describe("userinfo JWT verification", () => {
  const jwks = createLocalJWKSet({ keys: [] });
  const verify = createUserinfoJwtVerifier(jwks, {
    algorithm: "HS256",
    secret,
  });

  it.each(["HS256", "HS384", "HS512"] as const)(
    "verifies an explicitly configured %s response",
    async (algorithm) => {
      const verifier = createUserinfoJwtVerifier(jwks, { algorithm, secret });
      await expect(
        verifier(await sign(claims, algorithm)),
      ).resolves.toMatchObject(claims);
    },
  );

  it("rejects an invalid signature", async () => {
    await expect(
      verify(
        await sign(
          claims,
          "HS256",
          new TextEncoder().encode("wrong-secret".repeat(6)),
        ),
      ),
    ).rejects.toThrow();
  });

  it("does not let the token select a different HMAC algorithm", async () => {
    await expect(verify(await sign(claims, "HS512"))).rejects.toThrow(/alg/);
  });

  it("rejects unsigned and expired JWTs", async () => {
    await expect(verify(new UnsecuredJWT(claims).encode())).rejects.toThrow();
    const expired = await new SignJWT(claims)
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(1)
      .sign(key);
    await expect(verify(expired)).rejects.toThrow(/exp/);
  });

  it("keeps public-key verification and HMAC verification separate", async () => {
    const { publicKey, privateKey } = await generateKeyPair("RS256");
    const asymmetric = createUserinfoJwtVerifier(
      createLocalJWKSet({ keys: [await exportJWK(publicKey)] }),
    );
    const signed = await new SignJWT(claims)
      .setProtectedHeader({ alg: "RS256" })
      .setExpirationTime("1m")
      .sign(privateKey);
    await expect(asymmetric(signed)).resolves.toMatchObject(claims);
    await expect(asymmetric(await sign())).rejects.toThrow();
    await expect(verify(signed)).rejects.toThrow();
  });

  function resolver(body: string, contentType = "application/jwt") {
    return new UserinfoClaimsResolver({
      url: "https://idp.example/userinfo",
      discoveryUrl: "https://idp.example/.well-known/openid-configuration",
      claimNames: ["auth_mode"],
      clientId: "refapp",
      timeoutMs: 1000,
      requireSignedResponse: true,
      verifyJwt: verify,
      fetchFn: async () =>
        new Response(body, { headers: { "content-type": contentType } }),
    });
  }

  it("accepts the verified authentication mode for the same user, issuer and client", async () => {
    await expect(
      resolver(await sign()).resolve("access-token", claims),
    ).resolves.toEqual({ auth_mode: "CARD" });
  });

  it.each([
    { sub: "another-agent" },
    { sub: undefined },
    { iss: "https://another-idp.example" },
    { iss: undefined },
    { aud: "another-client" },
    { aud: undefined },
  ])(
    "rejects a valid signature with an invalid identity binding: %j",
    async (overrides) => {
      await expect(
        resolver(await sign({ ...claims, ...overrides })).resolve(
          "access-token",
          claims,
        ),
      ).resolves.toEqual({});
    },
  );

  it("does not fall back to unsigned JSON when a signed HMAC response is required", async () => {
    await expect(
      resolver(JSON.stringify(claims), "application/json").resolve(
        "access-token",
        claims,
      ),
    ).resolves.toEqual({});
  });
});
