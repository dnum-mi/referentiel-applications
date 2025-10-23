import type { ActorDto, CreateActorDto, UpdateActorDto } from "@/client/types.gen";
import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/api/index";

export const useActorStore = defineStore("actorStore", () => {
  const actors = ref<ActorDto[]>([]);

  async function countActors(): Promise<number> {
    const response = await api.actorControllerCountAllActors();
    return response.data ?? 0;
  }

  async function fetchActorsByApplication(applicationId: string) {
    const response = await api.applicationActorsControllerFindAll({
      path: { applicationId },
    });
    if (!response.response.ok) {
      throw new Error(`Failed to fetch actors for application ${applicationId}`);
    }
    if (!response.data) {
      throw new Error(`No actors found for application ${applicationId}`);
    }
    actors.value = response.data;
    return actors.value;
  }

  async function createActor(actor: CreateActorDto, applicationId: string): Promise<ActorDto | undefined> {
    const response = await api.applicationActorsControllerCreate({
      path: { applicationId },
      body: actor,
    });
    if (!response.response.ok) {
      throw new Error(`Failed to create actor for application ${applicationId}`);
    }
    return response.data;
  }

  async function updateActor({ id: _id, ...actor }: UpdateActorDto & { id?: string }, applicationId: string, actorId: string): Promise<ActorDto | undefined> {
    const response = await api.applicationActorsControllerUpdated({
      path: { applicationId, id: actorId },
      body: actor,
    });
    if (!response.response.ok) {
      throw new Error(`Failed to update actor for application ${applicationId}`);
    }
    return response.data;
  }

  async function deleteActor(actorId: string, applicationId: string) {
    return api.applicationActorsControllerDelete({
      path: { applicationId, id: actorId },
    });
  }

  return {
    actors,
    countActors,
    fetchActorsByApplication,
    createActor,
    updateActor,
    deleteActor,
  };
});
