import { registerAs } from "@nestjs/config";

export interface OidcConfig {
  jwksUrl: string;
  configUrl: string;
  clientId: string;
  /** Scopes demandés par le front à `/authorize` (OIDC_SCOPE, défaut `openid profile email`). */
  scope: string;
}

export const DEFAULT_OIDC_SCOPE = "openid profile email";

export default registerAs("oidc", (): OidcConfig => {
  const jwksUrl = process.env.OIDC_JWKS_URL;
  const configUrl = process.env.OIDC_CONFIG_URL;
  const clientId = process.env.OIDC_CLIENT_ID;
  // #1985 : si le fournisseur regroupe le claim de niveau d'authentification dans un scope
  // dédié, le front doit pouvoir le demander sans nouvelle release.
  const scope = process.env.OIDC_SCOPE?.trim() || DEFAULT_OIDC_SCOPE;

  if (!jwksUrl) {
    throw new Error("OIDC_JWKS_URL is not defined");
  }
  if (!configUrl) {
    throw new Error("OIDC_CONFIG_URL is not defined");
  }
  if (!clientId) {
    throw new Error("OIDC_CLIENT_ID is not defined");
  }

  return {
    jwksUrl,
    configUrl,
    clientId,
    scope,
  };
});
