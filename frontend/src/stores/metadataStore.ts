import { defineStore } from "pinia";
import { ref } from "vue";
import { call } from "@/api/callService";
import useToaster from "@/composables/use-toaster";
import type { Metadata } from "@/models/Application";

export const useMetadataStore = defineStore("metadataStore", () => {
    const metadatas = ref<Metadata[]>([]);
    const firstMetadata = ref<Metadata | null>(null);
    const lastMetadata = ref<Metadata | null>(null);
    const isLoading = ref(false);
    const toaster = useToaster();

    async function getFirstAndLastMetadataByApplication(applicationId: string) {
        isLoading.value = true;
        try {
            const { first, last } = await call("metadata", "getFirstAndLast", { applicationId });
            firstMetadata.value = first || null;
            lastMetadata.value = last || null;
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
            const result = await call("metadata", "getByAppId", { applicationId });
            metadatas.value = result || [];
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
