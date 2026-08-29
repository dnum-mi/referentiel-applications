import { UserManager } from "oidc-client-ts";
import { getConfig } from "./config";

const FRONTEND_URL = globalThis.location.origin;

const config = await getConfig();
if (config instanceof Error) {
  throw new Error("Failed to fetch OIDC configuration from backend");
}

// oidcConfigUrl is like "http://localhost:8082/realms/xxx/.well-known/openid-configuration"
// We need to extract the authority (base URL without .well-known path)
const authority = config.oidcConfigUrl.replace(/\/.well-known\/openid-configuration$/, "");
const clientId = config.oidcClientId;

export const USER_MANAGER = new UserManager({
  authority,
  client_id: clientId,
  redirect_uri: `${FRONTEND_URL}/oidc/callback`,
  // #2382 : page dédiée qui appelle signinSilentCallback() (la racine ne le faisait jamais,
  // le renew silencieux était donc cassé).
  silent_redirect_uri: `${FRONTEND_URL}/oidc/silent-callback`,
  // Renouvelle l'access token en arrière-plan avant son expiration (~5 min), évitant les 401
  // récurrents (déclenchés notamment par le polling du centre de notifications).
  automaticSilentRenew: true,
  post_logout_redirect_uri: `${FRONTEND_URL}`,
  response_type: "code",
  scope: "openid profile email",
});
