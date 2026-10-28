import { isApiSuccess } from "@/api/api-result";
import type { SavedFilterDto } from "@/client/types.gen";
import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/api/index";
import { useToasterStore } from "@/stores/toasterStore";
import { backendErrorMessage } from "@/utils/api-error";

export const useSavedFilterStore = defineStore("savedFilterStore", () => {
  const savedFilters = ref<SavedFilterDto[]>([]);
  const isLoading = ref(false);

  async function fetchSavedFilters() {
    isLoading.value = true;
    try {
      const response = await api.savedFilterControllerFindAll();
      if (response.data) {
        savedFilters.value = response.data;
      }
    } finally {
      isLoading.value = false;
    }
  }

  // Sauvegarder sous un nom déjà utilisé remplace le filtre existant côté serveur
  // (upsert) : on répercute ce remplacement dans la liste locale.
  async function saveFilter(name: string, filters: Record<string, unknown>) {
    const toaster = useToasterStore();
    try {
      const response = await api.savedFilterControllerCreate({ body: { name, filters } });
      if (!isApiSuccess(response) || !response.data) {
        throw new Error("Erreur lors de la sauvegarde du filtre");
      }
      const saved = response.data;
      savedFilters.value = [...savedFilters.value.filter((f) => f.name !== saved.name), saved];
      toaster.addSuccessMessage(`Filtre « ${saved.name} » sauvegardé.`);
      return saved;
    } catch {
      toaster.addErrorMessage("Erreur lors de la sauvegarde du filtre.");
      return undefined;
    }
  }

  async function deleteFilter(id: string) {
    const toaster = useToasterStore();
    try {
      const response = await api.savedFilterControllerRemove({ path: { id } });
      if (!isApiSuccess(response)) {
        throw new Error("Erreur lors de la suppression du filtre");
      }
      savedFilters.value = savedFilters.value.filter((f) => f.id !== id);
    } catch {
      toaster.addErrorMessage("Erreur lors de la suppression du filtre.");
    }
  }

  async function renameFilter(id: string, name: string) {
    const response = await api.savedFilterControllerRename({ path: { id }, body: { name } });
    if (!isApiSuccess(response) || !response.data) {
      throw new Error(backendErrorMessage(response.error) ?? "Erreur lors du renommage du filtre.");
    }
    const renamed = response.data;
    savedFilters.value = savedFilters.value.map((filter) => (filter.id === id ? { ...filter, name: renamed.name } : filter));
    return renamed;
  }

  return {
    savedFilters,
    isLoading,
    fetchSavedFilters,
    saveFilter,
    deleteFilter,
    renameFilter,
  };
});
