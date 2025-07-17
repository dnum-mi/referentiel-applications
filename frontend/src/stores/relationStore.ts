import { defineStore } from "pinia";
import type { Application, Relation } from "@/models/Application";
import Applications from "@/api/application";

export const useRelationStore = defineStore("relation", {
  state: () => ({
    currentApplication: {} as Application,
  }),

  getters: {
    allRelations(state): (Relation & { isSource: boolean })[] {
      return [
        ...(state.currentApplication.relationsAsSource || []).map((rel) => ({ ...rel, isSource: true })),
        ...(state.currentApplication.relationsAsTarget || []).map((rel) => ({ ...rel, isSource: false })),
      ];
    },
  },

  actions: {
    async setApplication(application: Application) {
      const enrichedApp: Application = { ...application };

      enrichedApp.relationsAsSource = await Promise.all(
        (application.relationsAsSource || []).map(async (rel) => {
          if (!rel.targetApplication) {
            rel.targetApplication = await Applications.getApplicationById(rel.applicationTargetId);
          }
          if (!rel.sourceApplication) {
            rel.sourceApplication = enrichedApp;
          }
          return rel;
        }),
      );

      enrichedApp.relationsAsTarget = await Promise.all(
        (application.relationsAsTarget || []).map(async (rel) => {
          if (!rel.sourceApplication) {
            rel.sourceApplication = await Applications.getApplicationById(rel.applicationSourceId);
          }
          if (!rel.targetApplication) {
            rel.targetApplication = enrichedApp;
          }
          return rel;
        }),
      );

      this.currentApplication = enrichedApp;
    },

    async updateRelation(updatedRelation: Relation) {
      if (!updatedRelation.targetApplication && updatedRelation.applicationTargetId) {
        updatedRelation.targetApplication = await Applications.getApplicationById(updatedRelation.applicationTargetId);
      }

      if (!updatedRelation.sourceApplication && updatedRelation.applicationSourceId) {
        updatedRelation.sourceApplication = await Applications.getApplicationById(updatedRelation.applicationSourceId);
      }

      const updateFn = (relations?: Relation[]) => {
        if (relations) {
          const index = relations.findIndex((rel) => rel.id === updatedRelation.id);
          if (index !== -1) {
            relations[index] = updatedRelation;
          }
        }
      };

      updateFn(this.currentApplication.relationsAsSource);
      updateFn(this.currentApplication.relationsAsTarget);
    },

    removeRelations(ids: string[]) {
      this.currentApplication.relationsAsSource = this.currentApplication.relationsAsSource?.filter((rel) => !ids.includes(rel.id));
      this.currentApplication.relationsAsTarget = this.currentApplication.relationsAsTarget?.filter((rel) => !ids.includes(rel.id));
    },
  },
});
