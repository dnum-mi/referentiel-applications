/**
 * Generate a test JWT token for the given user.
 * Since DISABLE_JWT_VALIDATION is set in tests, the middleware uses decodeJwt
 * which only decodes without verifying the signature.
 *
 * `claims` permet d'ajouter des claims au payload (ex. `{ auth_mode: "CARD" }` pour le
 * niveau d'authentification, #1985). Aucun claim n'est posé par défaut : `jest.setup.ts`
 * force `AUTH_LEVEL_MODE=off`, seul le spec dédié active l'évaluation.
 */
export function getToken(
  user: { email: string },
  claims: Record<string, unknown> = {},
): string {
  const header = { alg: "none", typ: "JWT" };
  const payload = {
    sub: user.email,
    email: user.email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    ...claims,
  };

  const base64Header = Buffer.from(JSON.stringify(header)).toString(
    "base64url",
  );
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );

  // Unsigned JWT (alg: none)
  return `${base64Header}.${base64Payload}.`;
}
