import { defineStore } from "pinia";
import { ref } from "vue";
import type { ActorType } from "@/models/ActorType";
import { call } from "@/api/callService";

export const useActorTypeStore = defineStore("actorTypeStore", () => {
  const actorTypes = ref<ActorType[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  async function fetchAll() {
    try {
      isLoading.value = true;
      const result = await call("actorType", "list");
      actorTypes.value = result;
    } catch (err: any) {
      console.error("❌ Erreur lors du chargement des types d'acteurs :", err);
      error.value = err.message ?? "Erreur inconnue";
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchById(id: string): Promise<ActorType | undefined> {
    try {
      return await call("actorType", "get", { id });
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
