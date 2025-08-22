import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useToasterStore } from "@/stores/toasterStore";
import type { APP_PERMISSIONS, ApplicationWithPerms } from "@/models/Application";
import api from "@/api/index";
import type { ApplicationPriorityRestart, PatchApplicationDto } from "@/client/types.gen";
import router from "@/router";
import { routeNames } from "@/router/route-names";

export const useApplicationStore = defineStore("applicationStore", () => {
  const applicationsById = ref<Record<string, ApplicationWithPerms>>({});
  const currentAppId = ref<string>();

  const application = computed(() => (currentAppId.value ? applicationsById.value[currentAppId.value] : undefined));
  const isLoading = ref(false);
  const toaster = useToasterStore();

  const getMyPerms = async (applicationId: string): Promise<Set<APP_PERMISSIONS>> => {
    const response = await api.applicationControllerGetMyPerms({ path: { applicationId } });
    return new Set(response.data);
  };

  const fetchApplication = async (applicationId: string, setCurrent = true): Promise<ApplicationWithPerms> => {
    try {
      isLoading.value = true;
      if (setCurrent) {
        currentAppId.value = applicationId;
      }
      const response = await api.applicationControllerFindOne({ path: { applicationId } });
      if (!response.data || !response.response.ok) {
        throw new Error("Erreur lors de la récupération de l'application.");
      }
      const myPerms = await getMyPerms(applicationId);
      const applicationWithPerms = { ...response.data, myPerms };
      applicationsById.value[response.data.id] = applicationWithPerms;
      return applicationWithPerms;
    } finally {
      isLoading.value = false;
    }
  };

  const patchApplication = async (app: ApplicationWithPerms): Promise<ApplicationWithPerms> => {
    const payload: PatchApplicationDto = {
      label: app.label,
      shortName: app.shortName ?? undefined,
      status: app.status,
      description: app.description,
      targetPopulations: app.targetPopulations,
      purposes: app.purposes,
      tags: app.tags,
      priorityRestart: app.priorityRestart as ApplicationPriorityRestart,
    };

    const response = await api.applicationControllerUpdate({
      path: { applicationId: app.id },
      body: payload,
    });
    if (!response.response.ok || !response.data) {
      throw new Error(`Failed to update application: ${response.response.statusText}`);
    }
    const myPerms: Set<APP_PERMISSIONS> | undefined = applicationsById.value[app.id]?.myPerms ?? await getMyPerms(app.id);

    return {
      ...response.data,
      myPerms,
    };
  };

  const patchApplicationsQuality = async (): Promise<string> => {
    const response = await api.applicationControllerUpdateAllApplicationsQuality();
    if (!response.data) {
      toaster.addErrorMessage("Erreur lors de la mise à jour des indices de qualité.");
      throw new Error("Erreur lors de la mise à jour des indices de qualité.");
    }
    return response.data;
  };

  const deleteApplication = async (applicationId: string): Promise<void> => {
    const response = await api.applicationControllerRemove({ path: { applicationId } });
    if (!response.response.ok) {
      toaster.addErrorMessage("Erreur lors de la suppression définitive de l'application.");
      throw new Error("Erreur lors de la suppression définitive de l'application.");
    }
    router.push({ name: routeNames.SEARCHAPP });
    toaster.addSuccessMessage("Application supprimée définitivement avec succès.");
  };

  return {
    application,
    applicationsById,
    currentAppId,
    isLoading,
    getMyPerms,
    fetchApplication,
    patchApplication,
    patchApplicationsQuality,
    deleteApplication,
  };
});
