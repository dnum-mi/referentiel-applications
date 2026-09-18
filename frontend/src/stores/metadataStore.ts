import type { MetadataDto } from "@/client/types.gen";
import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/api/index";
import { callApi } from "@/api/call-api";
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
    const data = await callApi(() => api.applicationMetadatasControllerGetFirstAndLastMetadata({ path: { applicationId } }), {
      isLoading,
      toaster,
      errorMessage: "Erreur lors de la récupération des metadatas.",
    });
    // Navigation rapide : une réponse arrivée en retard ne doit pas écraser
    // celle de la fiche courante.
    if (metadataApplicationId.value !== applicationId) {
      return;
    }
    firstMetadata.value = data?.first ?? null;
    lastMetadata.value = data?.last ?? null;
  }

  const fetchMetadatasByApplication = async (
    applicationId: string,
    query: { page?: number; pageSize?: number; sortBy?: string; order?: "asc" | "desc"; createdAtGte?: string; createdAtLte?: string } = {},
  ) => {
    metadatas.value = [];
    total.value = 0;
    const data = await callApi(() => api.applicationMetadatasControllerFind({ path: { applicationId }, query }), {
      isLoading,
      toaster,
      errorMessage: "Erreur lors de la récupération des metadatas.",
    });
    metadatas.value = data?.results ?? [];
    total.value = data?.total ?? 0;
  };

  const fetchMetadatas = async (
    query: { page?: number; pageSize?: number; sortBy?: string; order?: "asc" | "desc"; createdAtGte?: string; createdAtLte?: string } = {},
  ) => {
    metadatas.value = [];
    total.value = 0;
    const data = await callApi(() => api.metadatasControllerFind({ query }), {
      isLoading,
      toaster,
      errorMessage: "Erreur lors de la récupération des metadatas globales.",
    });
    metadatas.value = data?.results ?? [];
    total.value = data?.total ?? 0;
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
