import { jwtVerify, type JWTVerifyGetKey } from "jose";
import type { UserinfoHmacConfig } from "src/config/configs/auth-level.config";

/**
 * Le serveur choisit le type de clé et l'algorithme ; le header du JWT ne peut pas
 * faire basculer des clés publiques vers un secret partagé, ni inversement.
 * Ce secret est réservé à userinfo et n'authentifie jamais un appel à l'API RefApp.
 */
export function createUserinfoJwtVerifier(
  jwks: JWTVerifyGetKey,
  hmac?: UserinfoHmacConfig,
) {
  if (hmac) {
    const key = new TextEncoder().encode(hmac.secret);
    const algorithms = [hmac.algorithm];
    return async (jwt: string) =>
      (await jwtVerify(jwt, key, { algorithms })).payload;
  }
  return async (jwt: string) => (await jwtVerify(jwt, jwks)).payload;
}
