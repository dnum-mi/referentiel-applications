import { registerAs } from "@nestjs/config";

export interface KeycloakConfig {
  jwksUrl: string
  baseUrl: string
  realm: string
  clientId: string
}

export default registerAs("keycloak", (): KeycloakConfig => {
  const jwksUrl = process.env.KEYCLOAK_JWKS_URL;
  const baseUrl = process.env.KEYCLOAK_BASE_URL;
  const realm = process.env.KEYCLOAK_REALM;
  const clientId = process.env.KEYCLOAK_CLIENT_ID;

  if (!jwksUrl) {
    throw new Error("KEYCLOAK_JWKS_URL is not defined");
  }
  if (!baseUrl) {
    throw new Error("KEYCLOAK_BASE_URL is not defined");
  }
  if (!realm) {
    throw new Error("KEYCLOAK_REALM is not defined");
  }
  if (!clientId) {
    throw new Error("KEYCLOAK_CLIENT_ID is not defined");
  }

  return {
    jwksUrl,
    baseUrl,
    realm,
    clientId,
  };
});
