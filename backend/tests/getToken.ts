/**
 * Generate a test JWT token for the given user.
 * Since DISABLE_JWT_VALIDATION is set in tests, the middleware uses decodeJwt
 * which only decodes without verifying the signature.
 */
export function getToken(user: { email: string }): string {
  const header = { alg: "none", typ: "JWT" };
  const payload = {
    sub: user.email,
    email: user.email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
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
