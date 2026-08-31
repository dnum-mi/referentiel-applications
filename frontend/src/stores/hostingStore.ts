import type {
  CreateHostingDto,
  HostingDto,
  HostingOptionControllerFindAllData,
  HostingOptionDto,
  UpdateHostingDto,
} from "@/client/types.gen";
import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/api/index";
import { useToasterStore } from "@/stores/toasterStore";

type HostingOptionFiltersDto = HostingOptionControllerFindAllData["query"];
export const useHostingStore = defineStore("hostingStore", () => {
  const hostingOptions = ref<HostingOptionDto[]>([]);
  const hostings = ref<HostingDto[]>([]);
  /// Application à laquelle se rapportent `hostings`.
  const hostingsApplicationId = ref<string | null>(null);
  const isLoading = ref(false);
  const toaster = useToasterStore();

  async function countHostings() {
    isLoading.value = true;
    const response = await api.hostingsControllerCountAllHostings();
    isLoading.value = false;
    if (!response.response.ok) {
      toaster.addErrorMessage("Erreur lors de la récupération du nombre d'hébergements");
      console.error("Error counting hostings:", response.error);
      throw new Error(`Failed to count hostings: ${response.response.statusText}`);
    }
    return response.data ?? 0;
  }

  /**
   * Vide les hébergements. Le store survit à la navigation : sans purge, une fiche dont le
   * chargement échoue afficherait ceux de la fiche précédente. Le cas des droits manquants
   * est déjà couvert — le bloc est masqué par la même permission qui conditionne l'appel —
   * mais le chemin d'erreur, lui, ne l'était pas.
   */
  function resetHostings() {
    hostingsApplicationId.value = null;
    hostings.value = [];
  }

  const fetchHostings = async (applicationId: string) => {
    resetHostings();
    hostingsApplicationId.value = applicationId;
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
    // Navigation rapide : une réponse tardive ne doit pas écraser la fiche courante.
    if (hostingsApplicationId.value !== applicationId) return;
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
      path: { applicationId, id: hostingId },
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
      query: {
        ...filters,
        pageSize: filters?.pageSize ?? 0,
      },
    });
    if (!response.data?.results) {
      return [];
    }
    const responseData = response.data;
    hostingOptions.value = responseData.results;
    return hostingOptions.value;
  };

  return {
    hostings,
    hostingsApplicationId,
    resetHostings,
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
