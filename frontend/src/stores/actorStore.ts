import { defineStore } from "pinia";
import { ref } from "vue";
import type { Actor } from "@/models/Actor";
import Actors from "@/api/actor";

export const useActorStore = defineStore("actorStore", () => {
  const actors = ref<Actor[]>([]);

  async function fetchActorsByApplication(applicationId: string) {
    actors.value = await Actors.findByApplicationId(applicationId);
  }

  async function saveActor(actor: Actor): Promise<Actor> {
    const payload = {
      id: actor.id,
      role: actor.role,
      email: actor.email,
      firstname: actor.firstname,
      lastname: actor.lastname,
      userId: actor.userId,
      organizationId: actor.organizationId,
      applicationId: actor.applicationId,
      actorTypeId: actor.actorTypeId,
    };

    return !actor.id ? await Actors.create(payload) : await Actors.update(payload);
  }

  async function deleteActor(actorId: string, applicationId: string) {
    return await Actors.delete(applicationId, actorId);
  }

  return {
    actors,
    fetchActorsByApplication,
    saveActor,
    deleteActor,
  };
});
