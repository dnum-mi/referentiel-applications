import { defineStore } from "pinia";
import { ref } from "vue";
import type { Actor } from "@/models/Actor";
import { call } from "@/api/callService";

export const useActorStore = defineStore("actorStore", () => {
  const actors = ref<Actor[]>([]);

  async function fetchActorsByApplication(applicationId: string) {
    try {
      const res = await call("application", "get", { id: applicationId });
      actors.value = res.actors || [];
    } catch (error) {
      console.error("Erreur lors du chargement des acteurs", error);
    }
  }

  async function saveActor(actor: Actor, isNew: boolean): Promise<Actor> {
    try {
      if (!actor.applicationId) throw new Error("applicationId manquant pour créer/modifier un acteur");

      const variables = {
        ...actor,
        id: actor.id,
        applicationId: actor.applicationId,
      };

      const result = isNew ? await call("actor", "create", variables) : await call("actor", "update", variables);

      return result;
    } catch (error: any) {
      console.error("Erreur lors de la sauvegarde de l'acteur", error?.response?.data || error);
      throw error;
    }
  }

  async function deleteActor(actorId: string, applicationId: string) {
    try {
      const result = await call("actor", "delete", {
        id: actorId,
        applicationId,
      });
      return result;
    } catch (error: any) {
      console.error("Erreur lors de la suppression de l'acteur", error?.response?.data || error);
      throw error;
    }
  }

  return {
    actors,
    fetchActorsByApplication,
    saveActor,
    deleteActor,
  };
});
