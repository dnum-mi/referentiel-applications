import { registerAs } from "@nestjs/config";

export interface KeycloakConfig {
  jwksUrl: string;
  configUrl: string;
  clientId: string;
}

export default registerAs("keycloak", (): KeycloakConfig => {
  const jwksUrl = process.env.OIDC_JWKS_URL;
  const configUrl = process.env.OIDC_CONFIG_URL;
  const clientId = process.env.OIDC_CLIENT_ID;

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
  };
});
