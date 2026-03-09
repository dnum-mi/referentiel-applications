import type { CreateLabelDto, LabelDto, LabelSourceControllerFindAllData, LabelSourceDto } from "@/client/types.gen";
import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/api/index";
import { useToasterStore } from "@/stores/toasterStore";

type LabelSourceFiltersDto = LabelSourceControllerFindAllData["query"];
export const useLabelStore = defineStore("labelStore", () => {
  const labelSources = ref<LabelSourceDto[]>([]);
  const labels = ref<LabelDto[]>([]);
  const isLoading = ref(false);
  const toaster = useToasterStore();

  const fetchLabels = async (applicationId: string) => {
    isLoading.value = true;
    const response = await api.labelsControllerFindAllSorted({
      path: { applicationId },
    });
    isLoading.value = false;
    if (!response.response.ok) {
      toaster.addErrorMessage("Erreur lors de la récupération des noms alternatifs");
      throw new Error(`Failed to fetch labels: ${response.response.statusText}`);
    }
    labels.value = response.data ?? [];
  };

  const createLabel = async (applicationId: string, label: CreateLabelDto) => {
    const response = await api.labelsControllerCreate({
      path: { applicationId },
      body: label,
    });
    if (!response.response.ok) {
      toaster.addErrorMessage("Erreur lors de la création du nom alternatif");
      throw new Error(`Failed to create label: ${response.response.statusText}`);
    }
    await fetchLabels(applicationId);
    toaster.addSuccessMessage("Nom alternatif créé avec succès");
  };

  const updateLabel = async (applicationId: string, id: string, label: CreateLabelDto) => {
    const response = await api.labelsControllerUpdate({
      path: { applicationId, id },
      body: label,
    });
    if (!response.response.ok) {
      toaster.addErrorMessage("Erreur lors de la mise à jour du nom alternatif");
      throw new Error(`Failed to update label: ${response.response.statusText}`);
    }
    await fetchLabels(applicationId);
    toaster.addSuccessMessage("Nom alternatif mis à jour avec succès");
  };

  const deleteLabel = async (applicationId: string, id: string) => {
    const response = await api.labelsControllerDelete({
      path: { applicationId, id },
    });
    if (!response.response.ok) {
      toaster.addErrorMessage("Erreur lors de la suppression du nom alternatif");
      throw new Error(`Failed to delete label: ${response.response.statusText}`);
    }
    await fetchLabels(applicationId);
    toaster.addSuccessMessage("Nom alternatif supprimé avec succès");
  };

  const getAllLabelSources = async (filters: LabelSourceFiltersDto = {}): Promise<LabelSourceDto[]> => {
    const response = await api.labelSourceControllerFindAll({
      query: {
        ...filters,
        pageSize: filters?.pageSize ?? 0,
      },
    });
    const responseData = response.data as { results: LabelSourceDto[] };
    labelSources.value = responseData.results;
    return labelSources.value;
  };

  return {
    labels,
    labelSources,
    isLoading,
    fetchLabels,
    createLabel,
    updateLabel,
    deleteLabel,
    getAllLabelSources,
  };
});
