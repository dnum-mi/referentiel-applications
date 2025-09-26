import { defineStore } from "pinia";
import { ref } from "vue";
import { useToasterStore } from "@/stores/toasterStore";
import api from "@/api/index";
import type { MetadataDto } from "@/client/types.gen";

export const useMetadataStore = defineStore("metadataStore", () => {
  const metadatas = ref<MetadataDto[]>([]);
  const firstMetadata = ref<MetadataDto | null>(null);
  const lastMetadata = ref<MetadataDto | null>(null);
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

  const fetchMetadatasByApplication = async (applicationId: string) => {
    isLoading.value = true;
    const response = await api.applicationMetadataControllerFindAll({
      path: { applicationId },
    });
    isLoading.value = false;
    if (!response.response.ok) {
      toaster.addErrorMessage("Erreur lors de la récupération des metadatas.");
      console.error("Error fetching metadatas:", response.error);
      throw new Error(`Failed to fetch metadatas: ${response.response.statusText}`);
    }
    if (!response.data) {
      metadatas.value = [];
      return;
    }
    metadatas.value = response.data;
  };

  const fetchMetadatasGlobal = async () => {
    isLoading.value = true;
    try {
      console.log("Fetching global metadatas...");
      const response = await api.allMetadatasControllerFindAll();
      console.log(response);
      isLoading.value = false;
      metadatas.value = response.data ?? [];
    } catch (error) {
      isLoading.value = false;
      toaster.addErrorMessage("Erreur technique lors de la récupération des metadatas globales.");
      metadatas.value = [];
      console.error(error);
    }
  };

  return {
    firstMetadata,
    lastMetadata,
    metadatas,
    isLoading,
    getFirstAndLastMetadataByApplication,
    fetchMetadatasByApplication,
    fetchMetadatasGlobal,
  };
});
