import { UserManager } from "oidc-client-ts";
import { getConfig } from "./config";

const FRONTEND_URL = window.location.origin;

const config = await getConfig();
if (config instanceof Error) {
  throw new Error("Échec de la récupération de la configuration OIDC");
}

// oidcConfigUrl is like "http://localhost:8082/realms/xxx/.well-known/openid-configuration"
// We need to extract the authority (base URL without .well-known path)
const authority = config.oidcConfigUrl.replace(/\/.well-known\/openid-configuration$/, "");
const clientId = config.oidcClientId;

export const USER_MANAGER = new UserManager({
  authority,
  client_id: clientId,
  redirect_uri: `${FRONTEND_URL}/oidc/callback`,
  silent_redirect_uri: `${FRONTEND_URL}`,
  post_logout_redirect_uri: `${FRONTEND_URL}`,
  response_type: "code",
  scope: "openid profile email",
});
