import { defineStore } from "pinia";
import { ref } from "vue";
import { useToasterStore } from "@/stores/toasterStore";
import api from "@/api/index";
import type { MetadataDto } from "@/client/types.gen";

export const useMetadataStore = defineStore("metadataStore", () => {
  const metadatas = ref<MetadataDto[]>([]);
  const firstMetadata = ref<MetadataDto | null>(null);
  const lastMetadata = ref<MetadataDto | null>(null);
  const total = ref(0);
  const isLoading = ref(false);
  const toaster = useToasterStore();

  async function getFirstAndLastMetadataByApplication(applicationId: string) {
    isLoading.value = true;
    const response = await api.applicationMetadataControllerGetFirstAndLastMetadata({
      path: { applicationId },
    });
    isLoading.value = false;
    if (!response.response.ok) {
      toaster.addErrorMessage("Erreur lors de la récupération des metadatas.");
      console.error("Error fetching first and last metadata:", response.error);
      throw new Error(`Failed to fetch first and last metadata: ${response.response.statusText}`);
    }
    if (!response.data) {
      firstMetadata.value = null;
      lastMetadata.value = null;
    } else {
      firstMetadata.value = response.data.first;
      lastMetadata.value = response.data.last;
    }
  }

  const fetchMetadatasByApplication = async (applicationId: string, query: { page?: number, pageSize?: number, sortBy?: string, order?: "asc" | "desc", createdAtGte?: string, createdAtLte?: string } = {}) => {
    isLoading.value = true;
    const response = await api.applicationMetadataControllerFind({
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
    const responseData = response.data as any;
    metadatas.value = responseData.results ?? [];
    total.value = responseData.total ?? 0;
  };

  const fetchMetadatas = async (query: { page?: number, pageSize?: number, sortBy?: string, order?: "asc" | "desc", createdAtGte?: string, createdAtLte?: string } = {}) => {
    isLoading.value = true;
    try {
      console.log("Fetching global metadatas...");
      const response = await api.metadatasControllerFind({ query });
      console.log(response);
      isLoading.value = false;

      if (!response.data) {
        metadatas.value = [];
        total.value = 0;
        return;
      }

      // Handle paginated response
      const responseData = response.data as any;
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
    metadatas,
    total,
    isLoading,
    getFirstAndLastMetadataByApplication,
    fetchMetadatasByApplication,
    fetchMetadatasGlobal: fetchMetadatas,
  };
});
