import { defineStore } from "pinia";
import { ref } from "vue";
import { call } from "@/api/callService";

export const useSiteStore = defineStore("siteStore", () => {
  const sites = ref([]);

  async function fetchAll() {
    try {
      const result = await call("site", "listSites");

      sites.value = result.map((site: string) => ({
        id: site,
        label: site,
      }));
    } catch (err) {
      console.error(" Erreur lors du chargement des sites :", err);
    }
  }

  return { sites, fetchAll };
});
