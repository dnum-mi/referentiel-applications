import type { ActorTypeDto } from "@/client/types.gen.js";
import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/api/index.js";

export const useActorTypeStore = defineStore("actorTypeStore", () => {
  const actorTypes = ref<ActorTypeDto[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // `includeSystem` : inclut le type d'acteur système (droits par défaut d'un non-acteur),
  // exclu par défaut par l'API. Nécessaire uniquement pour la matrice des permissions, qui doit
  // résoudre le libellé de toutes les lignes, système comprise.
  async function fetchAll(includeSystem = false) {
    try {
      isLoading.value = true;
      const response = await api.actorTypeControllerFindAll({
        query: { pageSize: 0, includeSystem },
      });
      if (!response.response.ok) {
        throw new Error("Erreur lors de la récupération des types d'acteurs");
      }
      if (!response.data) {
        throw new Error("Aucun type d'acteur trouvé");
      }
      const responseData = response.data;
      actorTypes.value = responseData.results;
    } catch (err: any) {
      console.error("❌ Erreur lors du chargement des types d'acteurs :", err);
      error.value = err.message ?? "Erreur inconnue";
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchById(id: string): Promise<ActorTypeDto | undefined> {
    try {
      const response = await api.actorTypeControllerFindOne({ path: { id } });
      if (!response.response.ok) {
        throw new Error("Erreur lors de la récupération des types d'acteurs");
      }
      if (!response.data) {
        throw new Error("Aucun type d'acteur trouvé");
      }
      return response.data;
    } catch (err) {
      console.error(`❌ Erreur lors de la récupération du type d'acteur avec l'id ${id}`, err);
      return undefined;
    }
  }

  return {
    actorTypes,
    isLoading,
    error,
    fetchAll,
    fetchById,
  };
});
