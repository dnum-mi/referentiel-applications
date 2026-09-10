import axios from "axios";
import { client } from "@/client/client.gen";
import { USER_MANAGER } from "@/services/authentication";
import { IMPERSONATE_HEADER, clearImpersonationState, getImpersonatedUserId } from "@/services/impersonation";
import { isMaintenanceResponse, setMaintenanceMode } from "@/composables/use-maintenance-mode";
import { isBlockedAccessResponse, setBlockedAccess } from "@/composables/use-blocked-access";
import { STEP_DOWN_MESSAGES, WEAK_AUTH_PERMISSION_MESSAGE, isStepDownResponse, markStepDownNotice } from "@/composables/use-auth-level";

axios.defaults.baseURL = "/api/v2";
axios.defaults.withCredentials = true;
axios.defaults.headers.common.Accept = "application/json";
axios.defaults.headers.common["Content-Type"] = "application/json";
axios.defaults.timeout = 10000;

type ReqInterceptor = Parameters<typeof client.interceptors.request.use>[0];
const requestInterceptor: ReqInterceptor = async (req) => {
  const user = await USER_MANAGER.getUser();
  const token = user?.access_token;
  if (token) {
    req.headers.set("Authorization", `Bearer ${token}`);
  }
  const impersonatedUserId = getImpersonatedUserId();
  if (impersonatedUserId) {
    req.headers.set(IMPERSONATE_HEADER, impersonatedUserId);
  }
  return req;
};

type ResInterceptor = Parameters<typeof client.interceptors.response.use>[0];

// Évite de déclencher plusieurs redirections de ré-authentification quand
// plusieurs appels renvoient 401 simultanément.
let isReauthenticating = false;

export interface ConfigureClientsOptions {
  /** #1985 : vrai quand la session courante est rétrogradée (message de refus enrichi). */
  isAuthDowngraded?: () => boolean;
}

export function configureClients(toaster: { addErrorMessage: (message: string) => void }, options: ConfigureClientsOptions = {}) {
  const responseInterceptor: ResInterceptor = async (response) => {
    if (response.ok) {
      return response;
    }

    // 401 → token expiré/invalide : on ré-authentifie SANS logout dur. Si la session SSO
    // Keycloak est encore valide (cas normal d'un simple token expiré), on tente d'abord un
    // renouvellement silencieux ; à défaut, une redirection de connexion — qui, session SSO
    // valide, revient sans ressaisie. La route courante est mémorisée pour y revenir ensuite,
    // au lieu de repartir de l'accueil. (#2382)
    if (response.status === 401) {
      if (!isReauthenticating) {
        isReauthenticating = true;
        const currentPath = `${globalThis.location.pathname}${globalThis.location.search}`;
        if (!currentPath.startsWith("/oidc/")) {
          sessionStorage.setItem("redirectAfterLogin", currentPath);
        }
        try {
          // Renouvellement silencieux (iframe caché) : transparent si la session SSO est valide.
          await USER_MANAGER.signinSilent();
          isReauthenticating = false;
        } catch {
          try {
            await USER_MANAGER.signinRedirect();
          } catch {
            isReauthenticating = false;
          }
        }
      }
      return response;
    }

    // 403 → l'utilisateur est connecté mais non autorisé : on le notifie. Cas particulier :
    // un accès bloqué par un administrateur (cf. AuthMiddleware côté back) renvoie un payload
    // dédié — pas de ré-authentification (la session SSO reste valide, elle rebouclerait
    // aussitôt), mais un écran bloquant plutôt que le toast générique de permission refusée.
    if (response.status === 403) {
      const payload: unknown = await response
        .clone()
        .json()
        .catch(() => undefined);
      if (isBlockedAccessResponse(payload)) {
        setBlockedAccess(true);
        return response;
      }
      // #1985 : refus propre au niveau d'authentification. Une impersonation refusée est
      // rejouée à chaque requête depuis le localStorage : on la purge et on recharge une fois,
      // plutôt qu'un toast par appel. Les autres motifs ont leur message dédié.
      if (isStepDownResponse(payload)) {
        if (payload.reason === "impersonation") {
          clearImpersonationState();
          markStepDownNotice("impersonation"); // expliqué après le rechargement (userStore)
          globalThis.location.assign("/");
          return response;
        }
        toaster.addErrorMessage(STEP_DOWN_MESSAGES[payload.reason]);
        return response;
      }
      toaster.addErrorMessage(
        options.isAuthDowngraded?.()
          ? WEAK_AUTH_PERMISSION_MESSAGE
          : "Permission refusée : Vous n'avez pas la permission d'effectuer cette action.",
      );
      return response;
    }

    if (response.status === 503) {
      const payload: unknown = await response
        .clone()
        .json()
        .catch(() => undefined);
      if (isMaintenanceResponse(payload) && payload.maintenance) {
        setMaintenanceMode(true);
        toaster.addErrorMessage("Maintenance en cours : les données restent disponibles en lecture seule.");
      }
      return response;
    }

    // Autres erreurs (404, 5xx…) : on laisse les stores/composants gérer (ils
    // vérifient la réponse et lèvent au besoin). Pas de redirection globale sur un
    // 404 d'API — un 404 de page relève du routeur, pas de l'interceptor.
    return response;
  };

  // Configurer le nouveau client axios
  client.interceptors.request.use(requestInterceptor);

  client.setConfig({
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    // Serialize arrays as CSV (e.g. currentStatus__in=a,b,c) instead of repeating keys.
    // Some proxies/query parsers only keep the last repeated key.
    querySerializer: {
      array: {
        explode: false,
        style: "form",
      },
    },
  });

  client.interceptors.response.use(responseInterceptor);
}
