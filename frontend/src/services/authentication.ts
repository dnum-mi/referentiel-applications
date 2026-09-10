import { UserManager, type SigninRedirectArgs } from "oidc-client-ts";
import type { ConfigDto } from "@/client";
import { consumeReauthAttempt, markReauthAttempt } from "@/composables/use-auth-level";
import { clearImpersonationState } from "./impersonation";
import { getConfig } from "./config";

const FRONTEND_URL = globalThis.location.origin;

const loadedConfig = await getConfig();
if (loadedConfig instanceof Error) {
  throw new Error("Failed to fetch OIDC configuration from backend");
}
const config: ConfigDto = loadedConfig;

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
  // #1985 : servi par le backend (`OIDC_SCOPE`), pour demander un scope dédié au claim de niveau
  // d'authentification sans nouvelle release du front.
  scope: config.oidcScope,
});

/**
 * Reconnexion forte (#1985) : force une nouvelle authentification auprès du fournisseur pour que
 * l'agent puisse présenter sa carte agent ou sa double authentification. Les paramètres
 * (`prompt`, `acr_values`, `max_age`) viennent de `/config` et ne vont JAMAIS dans les réglages
 * du `UserManager` : ils s'appliqueraient au renouvellement silencieux (`prompt=none`) et à la
 * ré-authentification sur 401. Navigation complète : l'état de l'application repart de zéro.
 */
export async function signinStrong(): Promise<void> {
  const currentPath = `${globalThis.location.pathname}${globalThis.location.search}`;
  if (!currentPath.startsWith("/oidc/")) {
    sessionStorage.setItem("redirectAfterLogin", currentPath);
  }
  // Une impersonation persistée serait rejouée sur la nouvelle session : on la purge avant.
  clearImpersonationState();
  // L'ancien jeton (faible, encore valide quelques minutes) resterait dans le sessionStorage
  // d'oidc-client-ts : au retour sur /oidc/callback, le store le rechargerait et lancerait un
  // `/users/me` « faible » en concurrence avec celui de la nouvelle session. On le retire.
  await USER_MANAGER.removeUser();

  const reauth = config.authLevel?.reauth;
  const args: SigninRedirectArgs = { prompt: reauth?.prompt ?? "login" };
  if (reauth?.acrValues) args.acr_values = reauth.acrValues;
  if (reauth?.maxAge !== undefined) args.max_age = reauth.maxAge;

  markReauthAttempt();
  try {
    await USER_MANAGER.signinRedirect(args);
  } catch (error) {
    // Pas de navigation : sans nettoyage, le prochain `/users/me` afficherait à tort la
    // variante « votre reconnexion n'a pas été reconnue comme forte ».
    consumeReauthAttempt();
    throw error;
  }
}
