import { defineStore } from "pinia";
import { ref, computed } from "vue";
import Api from "@/api/application";
import useToaster from "@/composables/use-toaster";
import type { ApplicationWithPerms } from "@/models/Application";

export const useApplicationStore = defineStore("applicationStore", () => {
  const applicationsById = ref<Record<string, ApplicationWithPerms>>({});
  const currentAppId = ref<string>();

  const application = computed(() => (currentAppId.value ? applicationsById.value[currentAppId.value] : undefined));
  const isLoading = ref(false);
  const toaster = useToaster();

  const fetchApplication = async (applicationId: string, setCurrent = true): Promise<ApplicationWithPerms> => {
    try {
      isLoading.value = true;
      if (setCurrent) {
        currentAppId.value = applicationId;
      }
      const fetchedApp = await Api.getApplicationById(applicationId).catch((_err) => {
        toaster.addErrorMessage("Erreur lors de la récupération de l'application.");
      });
      if (!fetchedApp) {
        throw new Error("Erreur lors de la récupération de l'application.");
      }
      const fetchedRights = await Api.getMyPerms(applicationId).catch((_err) => {
        toaster.addErrorMessage("Erreur lors de la récupération des permissions sur l'application.");
      });
      if (!fetchedRights) {
        throw new Error("Erreur lors de la récupération des permissions sur l'application.");
      }
      const applicationWithPerms = { ...fetchedApp, myPerms: new Set(fetchedRights) };
      applicationsById.value[fetchedApp.id] = applicationWithPerms;
      return applicationWithPerms;
    } finally {
      isLoading.value = false;
    }
  };

  return {
    application,
    applicationsById,
    fetchApplication,
  };
});
