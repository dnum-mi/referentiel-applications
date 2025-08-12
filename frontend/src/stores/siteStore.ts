import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/api/index.js";

export const useSiteStore = defineStore("siteStore", () => {
  const sites = ref<string[]>([]);

  async function fetchAll() {
    const response = await api.sitesControllerFindDistinctSites();
    if (!response.response.ok) {
      throw new Error("Erreur lors de la récupération des sites");
    }
    if (!response.data) {
      console.warn("Aucun site trouvé.");
    }
    sites.value = response.data ?? [];
  }

  return { sites, fetchAll };
});
