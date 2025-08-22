import { getAuthentication } from "@/services/authentication";
import axios from "axios";
import router from "@/router/index.js";
import { routeNames } from "@/router/route-names";
import { client } from "@/client/client.gen";

const baseURL = `${import.meta.env.VITE_RDA_API_URL ?? "VITE_RDA_API_URL"}`;

axios.defaults.baseURL = `${baseURL}/api/v2`;
axios.defaults.withCredentials = true;
axios.defaults.headers.common.Accept = "application/json";
axios.defaults.headers.common["Content-Type"] = "application/json";
axios.defaults.timeout = 10000;

type ReqInterceptor = Parameters<typeof client.interceptors.request.use>[0];
const requestInterceptor: ReqInterceptor = (req) => {
  const keycloak = getAuthentication();
  const token = keycloak.token;
  if (token) {
    req.headers.set("Authorization", `Bearer ${token}`);
  }
  return req;
};

type ResInterceptor = Parameters<typeof client.interceptors.response.use>[0];
export function configureClients(toaster: { addErrorMessage: (message: string) => void }) {
  const responseInterceptor: ResInterceptor = async (response) => {
    const status = response.status;
    console.log({ status });

    // 401 → relance du login
    if (status === 401) {
      console.log("User is unauthorized");
      const authentication = getAuthentication();
      if (!authentication.authenticated) {
        authentication.login();
      }
      return Promise.reject(response);
    }

    // 403 → message d’erreur
    if (status === 403) {
      toaster.addErrorMessage("Permission refusée : Vous n'avez pas la permission d'effectuer cette action.");
      return Promise.reject(response);
    }

    // 404 → redirection vers NotFound
    if (status === 404) {
      router.replace({ name: routeNames.NOTFOUND });
      // on rejette quand même pour que d'éventuels catch côté composant ne continuent pas de tourner
      return Promise.reject(response);
    }

    // autres erreurs
    return Promise.reject(response);
  };

  // Configurer le nouveau client axios
  client.interceptors.request.use(requestInterceptor);

  client.setConfig({
    baseUrl: baseURL,
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  client.interceptors.response.use(responseInterceptor);
  client.interceptors.response.eject(responseInterceptor);
}
