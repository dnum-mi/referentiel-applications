import {
  USERINFO_NEGATIVE_TTL_MS,
  USERINFO_POSITIVE_TTL_MS,
  UserinfoClaimsResolver,
  UserinfoClaimsResolverOptions,
} from "./userinfo-claims";

const DISCOVERY_URL = "https://idp.example/.well-known/openid-configuration";
const USERINFO_URL = "https://idp.example/oauth2/userinfo";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function build(
  overrides: Partial<UserinfoClaimsResolverOptions> & {
    handler?: (url: string, init?: RequestInit) => Response | Promise<Response>;
  } = {},
) {
  let clock = 1_000_000;
  const fetchFn = jest.fn(async (input: string, init?: RequestInit) =>
    (overrides.handler ?? (() => jsonResponse({ sub: "u-1" })))(input, init),
  );
  const onError = jest.fn();
  const verifyJwt = jest.fn();
  const resolver = new UserinfoClaimsResolver({
    url: USERINFO_URL,
    discoveryUrl: DISCOVERY_URL,
    claimNames: ["auth_mode", "auth_idp"],
    timeoutMs: 2000,
    verifyJwt,
    onError,
    now: () => clock,
    fetchFn: fetchFn as unknown as typeof fetch,
    ...overrides,
  });
  return {
    resolver,
    fetchFn,
    onError,
    verifyJwt,
    advance: (ms: number) => {
      clock += ms;
    },
  };
}

const payload = { sub: "u-1", exp: 2_000_000 }; // exp en secondes, très au-delà de l'horloge

describe("UserinfoClaimsResolver (#1985)", () => {
  it("interroge userinfo avec le jeton et ne retient que les claims utiles", async () => {
    const { resolver, fetchFn } = build({
      handler: () =>
        jsonResponse({
          sub: "u-1",
          email: "a@b.c",
          auth_mode: "CARD",
          auth_idp: "principal",
        }),
    });

    await expect(resolver.resolve("jeton", payload)).resolves.toEqual({
      auth_mode: "CARD",
      auth_idp: "principal",
    });
    expect(fetchFn).toHaveBeenCalledWith(
      USERINFO_URL,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer jeton" }),
      }),
    );
  });

  it("met en cache par jeton, jusqu'à expiration du cache positif", async () => {
    const { resolver, fetchFn, advance } = build({
      handler: () => jsonResponse({ sub: "u-1", auth_mode: "CARD" }),
    });

    await resolver.resolve("jeton", payload);
    await resolver.resolve("jeton", payload);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    await resolver.resolve("autre-jeton", payload);
    expect(fetchFn).toHaveBeenCalledTimes(2);

    advance(USERINFO_POSITIVE_TTL_MS + 1);
    await resolver.resolve("jeton", payload);
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it("ne garde jamais une réponse au-delà de l'expiration du jeton", async () => {
    const { resolver, fetchFn, advance } = build({
      handler: () => jsonResponse({ sub: "u-1", auth_mode: "CARD" }),
    });
    const shortLived = {
      sub: "u-1",
      exp: Math.floor((1_000_000 + 10_000) / 1000),
    };

    await resolver.resolve("jeton", shortLived);
    advance(10_001);
    await resolver.resolve("jeton", shortLived);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("dédoublonne les requêtes concurrentes pour un même jeton", async () => {
    const { resolver, fetchFn } = build({
      handler: () => jsonResponse({ sub: "u-1", auth_mode: "CARD" }),
    });

    const [first, second] = await Promise.all([
      resolver.resolve("jeton", payload),
      resolver.resolve("jeton", payload),
    ]);
    expect(first).toEqual(second);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("traite un échec comme un claim absent, le met brièvement en cache et le journalise une fois", async () => {
    const { resolver, fetchFn, onError, advance } = build({
      handler: () => jsonResponse({ error: "invalid_token" }, 401),
    });

    await expect(resolver.resolve("jeton", payload)).resolves.toEqual({});
    await expect(resolver.resolve("jeton", payload)).resolves.toEqual({});
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toContain("HTTP 401");

    advance(USERINFO_NEGATIVE_TTL_MS + 1);
    await resolver.resolve("jeton", payload);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    // Au plus une ligne par minute.
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("traite une erreur réseau ou un délai dépassé comme un claim absent", async () => {
    const { resolver } = build({
      handler: () => {
        throw new TypeError("fetch failed");
      },
    });
    await expect(resolver.resolve("jeton", payload)).resolves.toEqual({});
  });

  // OIDC Core §5.3.2 : une réponse userinfo pour un autre sujet ne doit jamais être utilisée.
  it("ignore une réponse dont le sub diffère de celui du jeton", async () => {
    const { resolver, onError } = build({
      handler: () =>
        jsonResponse({ sub: "quelqu-un-d-autre", auth_mode: "CARD" }),
    });
    await expect(resolver.resolve("jeton", payload)).resolves.toEqual({});
    expect(onError.mock.calls[0][0]).toContain("sub");
  });

  it("vérifie une réponse signée (application/jwt) avec le JWKS du fournisseur", async () => {
    const { resolver, verifyJwt } = build({
      handler: () =>
        new Response("en-tete.charge.signature", {
          headers: { "content-type": "application/jwt" },
        }),
    });
    verifyJwt.mockResolvedValue({ sub: "u-1", auth_mode: "CARD" });

    await expect(resolver.resolve("jeton", payload)).resolves.toEqual({
      auth_mode: "CARD",
    });
    expect(verifyJwt).toHaveBeenCalledWith("en-tete.charge.signature");
  });

  it("rejette une réponse signée invalide", async () => {
    const { resolver, verifyJwt } = build({
      handler: () =>
        new Response("jwt-forge", {
          headers: { "content-type": "application/jwt" },
        }),
    });
    verifyJwt.mockRejectedValue(new Error("signature verification failed"));
    await expect(resolver.resolve("jeton", payload)).resolves.toEqual({});
  });

  it("découvre l'endpoint dans le document de découverte quand aucune URL n'est fournie", async () => {
    const { resolver, fetchFn } = build({
      url: undefined,
      handler: (url) =>
        url === DISCOVERY_URL
          ? jsonResponse({ userinfo_endpoint: USERINFO_URL })
          : jsonResponse({ sub: "u-1", auth_mode: "CARD" }),
    });

    await expect(resolver.resolve("jeton", payload)).resolves.toEqual({
      auth_mode: "CARD",
    });
    await resolver.resolve("autre-jeton", payload);
    // Le document de découverte n'est lu qu'une fois.
    expect(fetchFn.mock.calls.map(([url]) => url)).toEqual([
      DISCOVERY_URL,
      USERINFO_URL,
      USERINFO_URL,
    ]);
  });

  it("n'insiste pas sur une découverte en échec pendant une minute", async () => {
    const { resolver, fetchFn, advance } = build({
      url: undefined,
      handler: () => jsonResponse({}, 503),
    });

    await resolver.resolve("jeton-1", payload);
    await resolver.resolve("jeton-2", payload);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    advance(60_001);
    await resolver.resolve("jeton-3", payload);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("borne la taille du cache en évinçant les entrées les plus anciennes", async () => {
    const { resolver, fetchFn } = build({
      maxEntries: 2,
      handler: () => jsonResponse({ sub: "u-1", auth_mode: "CARD" }),
    });

    await resolver.resolve("jeton-1", payload);
    await resolver.resolve("jeton-2", payload);
    await resolver.resolve("jeton-3", payload); // évince jeton-1
    await resolver.resolve("jeton-1", payload);
    expect(fetchFn).toHaveBeenCalledTimes(4);
    await resolver.resolve("jeton-3", payload);
    expect(fetchFn).toHaveBeenCalledTimes(4);
  });

  // OIDC Core §5.3 : une réponse sans `sub` ne peut pas être rattachée au jeton.
  it("ignore une réponse sans sub quand le jeton en porte un", async () => {
    const { resolver } = build({
      handler: () => jsonResponse({ auth_mode: "CARD" }),
    });
    await expect(resolver.resolve("jeton", payload)).resolves.toEqual({});
  });

  it("accepte une réponse quand le jeton lui-même n'a pas de sub", async () => {
    const { resolver } = build({
      handler: () => jsonResponse({ auth_mode: "CARD" }),
    });
    await expect(
      resolver.resolve("jeton", { exp: 2_000_000 }),
    ).resolves.toEqual({ auth_mode: "CARD" });
  });

  it("rejette une réponse signée d'un autre émetteur ou pour un autre client", async () => {
    const signed = () =>
      new Response("jwt", { headers: { "content-type": "application/jwt" } });
    const withIssuer = { ...payload, iss: "https://idp.example" };

    const otherIssuer = build({ handler: signed, clientId: "refapp" });
    otherIssuer.verifyJwt.mockResolvedValue({
      sub: "u-1",
      iss: "https://autre.example",
      aud: "refapp",
      auth_mode: "CARD",
    });
    await expect(
      otherIssuer.resolver.resolve("jeton", withIssuer),
    ).resolves.toEqual({});

    const otherClient = build({ handler: signed, clientId: "refapp" });
    otherClient.verifyJwt.mockResolvedValue({
      sub: "u-1",
      iss: "https://idp.example",
      aud: ["autre-client"],
      auth_mode: "CARD",
    });
    await expect(
      otherClient.resolver.resolve("jeton", withIssuer),
    ).resolves.toEqual({});

    const sameBinding = build({ handler: signed, clientId: "refapp" });
    sameBinding.verifyJwt.mockResolvedValue({
      sub: "u-1",
      iss: "https://idp.example",
      aud: ["refapp"],
      auth_mode: "CARD",
    });
    await expect(
      sameBinding.resolver.resolve("jeton", withIssuer),
    ).resolves.toEqual({ auth_mode: "CARD" });
  });

  it("refuse un endpoint découvert qui n'est pas une URL http(s)", async () => {
    const { resolver, fetchFn } = build({
      url: undefined,
      handler: () => jsonResponse({ userinfo_endpoint: "file:///etc/passwd" }),
    });
    await expect(resolver.resolve("jeton", payload)).resolves.toEqual({});
    expect(fetchFn).toHaveBeenCalledTimes(1); // le document de découverte seulement
  });

  it("abandonne un appel qui dépasse le délai", async () => {
    const { resolver, onError } = build({
      timeoutMs: 20,
      handler: (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(init.signal?.reason ?? new Error("aborted")),
          );
        }),
    });
    await expect(resolver.resolve("jeton", payload)).resolves.toEqual({});
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
