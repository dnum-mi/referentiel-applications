import axios from "axios";
import { client } from "@/client/client.gen";
import router from "@/router/index.js";
import { routeNames } from "@/router/route-names";
import { USER_MANAGER } from "@/services/authentication";

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
  return req;
};

type ResInterceptor = Parameters<typeof client.interceptors.response.use>[0];
export function configureClients(toaster: { addErrorMessage: (message: string) => void }) {
  const responseInterceptor: ResInterceptor = async (response) => {
    if (response.ok) {
      return response;
    }

    // 401 → session invalide : on redirige vers /oidc/logout pour déconnecter l'utilisateur
    if (response.status === 401) {
      await USER_MANAGER.signoutRedirect();
      return response;
    }

    // 403 → message d’erreur
    if (response.status === 403) {
      toaster.addErrorMessage("Permission refusée : Vous n'avez pas la permission d'effectuer cette action.");
      return response;
    }

    // 404 → redirection vers NotFound
    if (response.status === 404) {
      router.replace({ name: routeNames.NOTFOUND });
      return response;
    }

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
