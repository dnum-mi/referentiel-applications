import { defineStore } from "pinia";
import { ref } from "vue";
import { call } from "@/api/callService";

export const useSiteStore = defineStore("siteStore", () => {
  const sites = ref([]);

  async function fetchAll() {
    const result = await call("site", "listSites");
    sites.value = result.map((site: string) => ({
      id: site,
      label: site,
    }));
  }

  return { sites, fetchAll };
});
