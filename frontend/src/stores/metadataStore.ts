import type { MetadataDto } from "@/client/types.gen";
import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/api/index";
import { useToasterStore } from "@/stores/toasterStore";

export const useMetadataStore = defineStore("metadataStore", () => {
  const metadatas = ref<MetadataDto[]>([]);
  const currentMetadata = ref<MetadataDto | null>(null);
  const firstMetadata = ref<MetadataDto | null>(null);
  const lastMetadata = ref<MetadataDto | null>(null);
  /// Application à laquelle se rapportent `firstMetadata` / `lastMetadata`.
  const metadataApplicationId = ref<string | null>(null);
  const total = ref(0);
  const isLoading = ref(false);
  const toaster = useToasterStore();

  /**
   * Vide les metadatas de fiche. À appeler dès qu'on ne peut pas les charger
   * pour l'application affichée : sans ça, le store — qui survit à la
   * navigation — conserve celles de la fiche précédente et les affiche sous
   * une application qui n'a rien à voir.
   */
  function resetFirstAndLastMetadata() {
    metadataApplicationId.value = null;
    firstMetadata.value = null;
    lastMetadata.value = null;
  }

  async function getFirstAndLastMetadataByApplication(applicationId: string) {
    // Purge immédiate : tant que la réponse n'est pas là, aucune donnée de la
    // fiche précédente ne doit rester affichée (a fortiori si l'appel échoue).
    resetFirstAndLastMetadata();
    metadataApplicationId.value = applicationId;
    isLoading.value = true;
    const response = await api.applicationMetadatasControllerGetFirstAndLastMetadata({
      path: { applicationId },
    });
    isLoading.value = false;
    if (!response.response.ok) {
      toaster.addErrorMessage("Erreur lors de la récupération des metadatas.");
      console.error("Error fetching first and last metadata:", response.error);
      throw new Error(`Failed to fetch first and last metadata: ${response.response.statusText}`);
    }
    // Navigation rapide : une réponse arrivée en retard ne doit pas écraser
    // celle de la fiche courante.
    if (metadataApplicationId.value !== applicationId) {
      return;
    }
    if (response.data) {
      firstMetadata.value = response.data.first;
      lastMetadata.value = response.data.last;
    } else {
      firstMetadata.value = null;
      lastMetadata.value = null;
    }
  }

  const fetchMetadatasByApplication = async (
    applicationId: string,
    query: { page?: number; pageSize?: number; sortBy?: string; order?: "asc" | "desc"; createdAtGte?: string; createdAtLte?: string } = {},
  ) => {
    isLoading.value = true;
    const response = await api.applicationMetadatasControllerFind({
      path: { applicationId },
      query,
    });
    isLoading.value = false;
    if (!response.response.ok) {
      toaster.addErrorMessage("Erreur lors de la récupération des metadatas.");
      console.error("Error fetching metadatas:", response.error);
      throw new Error(`Failed to fetch metadatas: ${response.response.statusText}`);
    }
    if (!response.data) {
      metadatas.value = [];
      total.value = 0;
      return;
    }

    // Handle paginated response
    const responseData = response.data;
    metadatas.value = responseData.results ?? [];
    total.value = responseData.total ?? 0;
  };

  const fetchMetadatas = async (
    query: { page?: number; pageSize?: number; sortBy?: string; order?: "asc" | "desc"; createdAtGte?: string; createdAtLte?: string } = {},
  ) => {
    isLoading.value = true;
    try {
      const response = await api.metadatasControllerFind({ query });
      isLoading.value = false;

      if (!response.data) {
        metadatas.value = [];
        total.value = 0;
        return;
      }

      // Handle paginated response
      const responseData = response.data;
      metadatas.value = responseData.results ?? [];
      total.value = responseData.total ?? 0;
    } catch (error) {
      isLoading.value = false;
      toaster.addErrorMessage("Erreur technique lors de la récupération des metadatas globales.");
      metadatas.value = [];
      total.value = 0;
      console.error(error);
    }
  };

  return {
    firstMetadata,
    lastMetadata,
    metadataApplicationId,
    metadatas,
    currentMetadata,
    total,
    isLoading,
    getFirstAndLastMetadataByApplication,
    resetFirstAndLastMetadata,
    fetchMetadatasByApplication,
    fetchMetadatasGlobal: fetchMetadatas,
  };
});
