import { registerAs } from "@nestjs/config";

export interface OidcConfig {
  jwksUrl: string;
  configUrl: string;
  clientId: string;
  /** Émetteur exact des JWT d'accès, indépendant de l'adresse interne du JWKS. */
  issuer: string;
  /** Audiences de ressource acceptées par l'API, distinctes du client frontend. */
  audiences: string[];
  /** Scopes demandés par le front à `/authorize` (OIDC_SCOPE, défaut `openid profile email`). */
  scope: string;
}

export const DEFAULT_OIDC_SCOPE = "openid profile email";

export default registerAs("oidc", (): OidcConfig => {
  const jwksUrl = process.env.OIDC_JWKS_URL;
  const configUrl = process.env.OIDC_CONFIG_URL;
  const clientId = process.env.OIDC_CLIENT_ID;
  const issuer = process.env.OIDC_ISSUER?.trim();
  const audiences = process.env.OIDC_AUDIENCES?.split(",").map((value) =>
    value.trim(),
  );
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
  if (!issuer) {
    throw new Error("OIDC_ISSUER is not defined");
  }
  let issuerUrl: URL;
  try {
    issuerUrl = new URL(issuer);
  } catch {
    throw new Error("OIDC_ISSUER must be an absolute HTTP(S) URL");
  }
  if (
    !["http:", "https:"].includes(issuerUrl.protocol) ||
    issuerUrl.username ||
    issuerUrl.password ||
    issuerUrl.search ||
    issuerUrl.hash
  ) {
    throw new Error(
      "OIDC_ISSUER must be an HTTP(S) URL without credentials, query or fragment",
    );
  }
  if (!audiences?.length || audiences.some((value) => !value)) {
    throw new Error("OIDC_AUDIENCES must contain non-empty resource audiences");
  }

  return {
    jwksUrl,
    configUrl,
    clientId,
    issuer,
    audiences: [...new Set(audiences)],
    scope,
  };
});
