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
import { callApi, withLoading } from "@/api/call-api";
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
    return (
      (await callApi(() => api.hostingsControllerCountAllHostings(), {
        isLoading,
        toaster,
        errorMessage: "Erreur lors de la récupération du nombre d'hébergements",
      })) ?? 0
    );
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
    const data = await callApi(() => api.applicationHostingsControllerFindAll({ path: { applicationId } }), {
      isLoading,
      toaster,
      errorMessage: "Erreur lors de la récupération des hébergements",
    });
    // Navigation rapide : une réponse tardive ne doit pas écraser la fiche courante.
    if (hostingsApplicationId.value !== applicationId) return;
    hostings.value = data ?? [];
  };

  const createHosting = (applicationId: string, hosting: CreateHostingDto) =>
    withLoading(isLoading, async () => {
      await callApi(() => api.applicationHostingsControllerCreate({ path: { applicationId }, body: hosting }), {
        toaster,
        errorMessage: "Erreur lors de la création de l'hébergement",
      });
      await fetchHostings(applicationId);
      toaster.addSuccessMessage("Hébergement créé avec succès");
    });

  const updateHosting = (applicationId: string, id: string, hosting: UpdateHostingDto) =>
    withLoading(isLoading, async () => {
      await callApi(() => api.applicationHostingsControllerUpdate({ path: { applicationId, id }, body: hosting }), {
        toaster,
        errorMessage: "Erreur lors de la mise à jour de l'hébergement",
      });
      await fetchHostings(applicationId);
      toaster.addSuccessMessage("Hébergement mis à jour avec succès");
    });

  const deleteHosting = (applicationId: string, hostingId: string) =>
    withLoading(isLoading, async () => {
      await callApi(() => api.applicationHostingsControllerRemove({ path: { applicationId, id: hostingId } }), {
        toaster,
        errorMessage: "Erreur lors de la suppression de l'hébergement",
      });
      await fetchHostings(applicationId);
      toaster.addSuccessMessage("Hébergement supprimé avec succès");
    });

  const getAllHostingOptions = async (filters: HostingOptionFiltersDto = {}): Promise<HostingOptionDto[]> => {
    const data = await callApi(() => api.hostingOptionControllerFindAll({ query: { ...filters, pageSize: filters?.pageSize ?? 0 } }), {
      isLoading,
      toaster,
      errorMessage: "Erreur lors de la récupération des options d'hébergement",
    });
    hostingOptions.value = data?.results ?? [];
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
