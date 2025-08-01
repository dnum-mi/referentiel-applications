import { defineStore } from "pinia";
import { ref } from "vue";
import useToaster from "@/composables/use-toaster";
import type { Metadata } from "@/models/Application";
import Metadatas from "@/api/metadata";

export const useMetadataStore = defineStore("metadataStore", () => {
    const metadatas = ref<Metadata[]>([]);
    const firstMetadata = ref<Metadata | null>(null);
    const lastMetadata = ref<Metadata | null>(null);
    const isLoading = ref(false);
    const toaster = useToaster();

    async function getFirstAndLastMetadataByApplication(applicationId: string) {
        isLoading.value = true;
        try {
            const data = await Metadatas.getFirstAndLastByApplicationId(applicationId);
            firstMetadata.value = data.first || null;
            lastMetadata.value = data.last || null;
        } catch (error) {
            toaster.addErrorMessage("Erreur lors de la récupération des metadatas.");
            throw error;
        } finally {
            isLoading.value = false;
        }
    }

    const fetchMetadatasByApplication = async (applicationId: string) => {
        try {
            isLoading.value = true;
            metadatas.value = await Metadatas.findByApplicationId(applicationId) || [];
        } catch (error) {
            toaster.addErrorMessage("Erreur lors de la récupération des metadatas.");
            throw error;
        } finally {
            isLoading.value = false;
        }
    };

    return {
        firstMetadata,
        lastMetadata,
        metadatas,
        isLoading,
        getFirstAndLastMetadataByApplication,
        fetchMetadatasByApplication,
    };
});
