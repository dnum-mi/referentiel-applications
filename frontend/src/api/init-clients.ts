import axios from "axios";
import { client } from "@/client/client.gen";
import { USER_MANAGER } from "@/services/authentication";
import { IMPERSONATE_HEADER, getImpersonatedUserId } from "@/services/impersonation";
import { isMaintenanceResponse, setMaintenanceMode } from "@/composables/use-maintenance-mode";

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

export function configureClients(toaster: { addErrorMessage: (message: string) => void }) {
  const responseInterceptor: ResInterceptor = async (response) => {
    if (response.ok) {
      return response;
    }

    // 401 → session invalide : on ré-authentifie l'utilisateur. Si la session SSO
    // Keycloak est encore valide, le retour est transparent ; sinon il voit le
    // formulaire de connexion. (On ne fait pas un logout dur, qui forcerait une
    // reconnexion complète même pour une simple expiration de token.)
    if (response.status === 401) {
      if (!isReauthenticating) {
        isReauthenticating = true;
        try {
          await USER_MANAGER.signoutRedirect();
        } catch {
          isReauthenticating = false;
        }
      }
      return response;
    }

    // 403 → l'utilisateur est connecté mais non autorisé : on le notifie.
    if (response.status === 403) {
      toaster.addErrorMessage("Permission refusée : Vous n'avez pas la permission d'effectuer cette action.");
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
