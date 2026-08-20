import type { SavedFilterDto } from "@/client/types.gen";
import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/api/index";
import { useToasterStore } from "@/stores/toasterStore";

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
      if (!response.response.ok || !response.data) {
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
      if (!response.response.ok) {
        throw new Error("Erreur lors de la suppression du filtre");
      }
      savedFilters.value = savedFilters.value.filter((f) => f.id !== id);
    } catch {
      toaster.addErrorMessage("Erreur lors de la suppression du filtre.");
    }
  }

  return {
    savedFilters,
    isLoading,
    fetchSavedFilters,
    saveFilter,
    deleteFilter,
  };
});
