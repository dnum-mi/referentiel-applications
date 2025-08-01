import { defineStore } from "pinia";
import { ref } from "vue";
import { useToasterStore } from "@/stores/toasterStore";
import api from "@/api/index";
import type { CreateHostingDto, HostingDto, HostingOptionControllerFindAllData, HostingOptionDto, UpdateHostingDto } from "@/client/types.gen";

type HostingOptionFiltersDto = HostingOptionControllerFindAllData["query"];
export const useHostingStore = defineStore("hostingStore", () => {
  const hostingOptions = ref<HostingOptionDto[]>([]);
  const hostings = ref<HostingDto[]>([]);
  const isLoading = ref(false);
  const toaster = useToasterStore();

  async function countHostings() {
    isLoading.value = true;
    const response = await api.hostingControllerCountAllHostings();
    isLoading.value = false;
    if (!response.response.ok) {
      toaster.addErrorMessage("Erreur lors de la récupération du nombre d'hébergements");
      console.error("Error counting hostings:", response.error);
      throw new Error(`Failed to count hostings: ${response.response.statusText}`);
    }
    return response.data ?? 0;
  }

  const fetchHostings = async (applicationId: string) => {
    isLoading.value = true;
    const response = await api.applicationHostingsControllerFindAll({
      path: { applicationId },
    });
    isLoading.value = false;
    if (!response.response.ok) {
      toaster.addErrorMessage("Erreur lors de la récupération des hébergements");
      console.error("Error fetching hostings:", response.error);
      throw new Error(`Failed to fetch hostings: ${response.response.statusText}`);
    }
    hostings.value = response.data ?? [];
  };

  const createHosting = async (applicationId: string, hosting: CreateHostingDto) => {
    const response = await api.applicationHostingsControllerCreate({
      path: { applicationId },
      body: hosting,
    });
    if (!response.response.ok) {
      toaster.addErrorMessage("Erreur lors de la création de l'hébergement");
      console.error("Error creating hosting:", response.error);
      throw new Error(`Failed to create hosting: ${response.response.statusText}`);
    }
    await fetchHostings(applicationId);
    toaster.addSuccessMessage("Hébergement créé avec succès");
  };

  const updateHosting = async (applicationId: string, id: string, hosting: UpdateHostingDto) => {
    const response = await api.applicationHostingsControllerUpdate({
      path: { applicationId, id },
      body: hosting,
    });
    if (!response.response.ok) {
      toaster.addErrorMessage("Erreur lors de la mise à jour de l'hébergement");
      console.error("Error updating hosting:", response.error);
      throw new Error(`Failed to update hosting: ${response.response.statusText}`);
    }
    await fetchHostings(applicationId);
    toaster.addSuccessMessage("Hébergement mis à jour avec succès");
  };

  const deleteHosting = async (applicationId: string, hostingId: string) => {
    const response = await api.applicationHostingsControllerRemove({
      path: { id: hostingId },
    });
    if (!response.response.ok) {
      toaster.addErrorMessage("Erreur lors de la suppression de l'hébergement");
      console.error("Error deleting hosting:", response.error);
      throw new Error(`Failed to delete hosting: ${response.response.statusText}`);
    }
    await fetchHostings(applicationId);
    toaster.addSuccessMessage("Hébergement supprimé avec succès");
  };

  const getAllHostingOptions = async (filters: HostingOptionFiltersDto = {}): Promise<HostingOptionDto[]> => {
    const response = await api.hostingOptionControllerFindAll({
      query: filters,
    });
    hostingOptions.value = response.data ?? [];
    return response.data ?? [];
  };

  return {
    hostings,
    hostingOptions,
    isLoading,
    countHostings,
    fetchHostings,
    createHosting,
    updateHosting,
    deleteHosting,
    getAllHostingOptions,
  };
});
