import { defineStore } from "pinia";
import { ref } from "vue";
import type { Actor } from "@/models/Actor";
import Actors from "@/api/actor";

export const useActorStore = defineStore("actorStore", () => {
  const actors = ref<Actor[]>([]);

  async function countActors() {
    return Actors.countActors();
  }

  async function fetchActorsByApplication(applicationId: string) {
    actors.value = await Actors.findByApplicationId(applicationId);
  }

  async function saveActor(actor: Actor): Promise<Actor> {
    return !actor.id ? await Actors.create(actor) : await Actors.update(actor);
  }

  async function deleteActor(actorId: string, applicationId: string) {
    return await Actors.delete(applicationId, actorId);
  }

  return {
    actors,
    countActors,
    fetchActorsByApplication,
    saveActor,
    deleteActor,
  };
});
