import type { EndOfLifeApplicationDto, EndOfLifeControllerFindEndOfLifeApplicationsData } from "@/client/types.gen";
import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/api/index";
import { useToasterStore } from "@/stores/toasterStore";

export type EndOfLifeQuery = NonNullable<EndOfLifeControllerFindEndOfLifeApplicationsData["query"]>;

/** Vue transverse des fins de vie (#2236). */
export const useEndOfLifeStore = defineStore("endOfLifeStore", () => {
  const applications = ref<EndOfLifeApplicationDto[]>([]);
  const total = ref(0);
  const isLoading = ref(false);
  const toaster = useToasterStore();

  async function fetchApplications(query: EndOfLifeQuery = {}) {
    isLoading.value = true;
    try {
      const response = await api.endOfLifeControllerFindEndOfLifeApplications({ query });
      if (!response.response.ok) {
        toaster.addErrorMessage("Erreur lors de la récupération des fins de vie.");
        console.error("Error fetching end-of-life applications:", response.error);
        return;
      }
      applications.value = response.data?.results ?? [];
      total.value = response.data?.total ?? 0;
    } finally {
      // `finally` et non une remise à zéro en fin de bloc : sur une erreur
      // réseau, le spinner resterait sinon bloqué (cf. #2248).
      isLoading.value = false;
    }
  }

  return { applications, total, isLoading, fetchApplications };
});
