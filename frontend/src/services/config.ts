import type { ConfigDto } from "@/client";
import api from "@/api";

// Mémoïse la PROMESSE (pas seulement le résultat) : App.vue et la garde de
// route peuvent demander la config en même temps au boot sans déclencher deux
// requêtes. Un échec n'est pas mémoïsé, pour qu'une tentative ultérieure puisse
// réussir (ex. backend momentanément indisponible au premier chargement).
let configPromise: Promise<ConfigDto | Error> | null = null;

export async function getConfig() {
  if (!configPromise) {
    configPromise = api
      .getConfig()
      .then((response) => {
        if (!response.data || !response.response.ok) {
          configPromise = null;
          return new Error("Failed to fetch configuration");
        }
        return response.data;
      })
      .catch(() => {
        configPromise = null;
        return new Error("Failed to fetch configuration");
      });
  }
  return configPromise;
}
