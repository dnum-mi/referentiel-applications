import { authentication } from "@/services/authentication";
import type { AxiosError } from "axios";
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

function requestInterceptor(config: any) {
  const token = authentication.token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}

export function configureClients(toaster: { addErrorMessage: (message: string) => void }) {
  function responseErrorInterceptor(error: AxiosError) {
    const status = error.response?.status;

    // 401 → relance du login
    if (status === 401) {
      authentication.login({ redirectUri: window.location.href });
      return Promise.reject(error);
    }

    // 403 → message d’erreur
    if (status === 403) {
      toaster.addErrorMessage("Permission refusée : Vous n'avez pas la permission d'effectuer cette action.");
      return Promise.reject(error);
    }

    // 404 → redirection vers NotFound
    if (status === 404) {
      router.replace({ name: routeNames.NOTFOUND });
      // on rejette quand même pour que d'éventuels catch côté composant ne continuent pas de tourner
      return Promise.reject(error);
    }

    // autres erreurs
    return Promise.reject(error);
  }

  // Configurer l'ancien client axios
  axios.interceptors.request.use(requestInterceptor, (error) => {
    return Promise.reject(error);
  });

  axios.interceptors.response.use(
    response => response,
    responseErrorInterceptor,
  );

  // Configurer le nouveau client axios
  client.interceptors.request.use((req) => {
    const token = authentication.token;
    if (token) {
      req.headers.set("Authorization", `Bearer ${token}`);
    }
    return req;
  });

  client.setConfig({
    baseUrl: baseURL,
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  client.interceptors.response.eject((res) => {
    const status = res.status;
    // 401 → relance du login
    if (status === 401) {
      authentication.login({ redirectUri: window.location.href });
      return Promise.reject(res);
    }

    // 403 → message d’erreur
    if (status === 403) {
      toaster.addErrorMessage("Permission refusée : Vous n'avez pas la permission d'effectuer cette action.");
      return Promise.reject(res);
    }

    // 404 → redirection vers NotFound
    if (status === 404) {
      router.replace({ name: routeNames.NOTFOUND });
      // on rejette quand même pour que d'éventuels catch côté composant ne continuent pas de tourner
      return Promise.reject(res);
    }

    // autres erreurs
    return Promise.reject(res);
  });
}
