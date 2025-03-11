import { defineStore } from "pinia";
import Applications from "@/api/application";
import type { Actor } from "@/models/Application";

export const useActorStore = defineStore("actorStore", {
  state: () => ({
    actors: [] as Actor[],
  }),

  actions: {
    async fetchActors(applicationId: string) {
      try {
        const app = await Applications.getApplicationById(applicationId);
        this.actors = app.actors || [];
      } catch (error) {
        console.error("Erreur lors du chargement des acteurs", error);
        this.actors = [];
      }
    },

    async saveActor(application: any, actor: any, isNew: boolean) {
      const updatedActors = isNew
        ? [...(application.actors || []), actor]
        : (application.actors || []).map((a: any) => (a.id === actor.id ? actor : a));
      return await Applications.patchApplication({
        ...application,
        actors: updatedActors,
      });
    },

    async deleteActor(application: any, actorToDelete: any) {
      const updatedActors = (application.actors || []).filter((a: any) => a.id !== actorToDelete.id);
      return await Applications.patchApplication({
        ...application,
        actors: updatedActors,
      });
    },

    async updateActors(application: any, actors: Actor[]) {
      return await Applications.patchApplication({
        ...application,
        actors,
      });
    },
  },
});
