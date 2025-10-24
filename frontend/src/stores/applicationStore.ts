import type { Filters } from "./applicationSearchStore";
import type { ApplicationPriorityRestart, PatchApplicationDto } from "@/client/types.gen";
import type { APP_PERMISSIONS, ApplicationWithPerms } from "@/models/Application";
import { computed, ref } from "vue";
import api from "@/api/index";
import router from "@/router";
import { routeNames } from "@/router/route-names";
import { useToasterStore } from "@/stores/toasterStore";

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

  const exportToExcel = async (filters: Filters = {}): Promise<Blob> => {
    const cleanedFilters = cleanFilters(filters);
    cleanedFilters.pageSize = 0;
    const response = await api.applicationControllerExportExcel({
      query: cleanedFilters,
    });

    if (!response.response.ok || !response.data) {
      throw new Error("Erreur lors de l'export Excel.");
    }

    return new Blob([response.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  };

  const downloadExcel = async (filters: Filters): Promise<void> => {
    const blob = await exportToExcel(filters);
    const date = new Date().toISOString().split("T")[0];
    downloadBlob(blob, `applications_export_${date}.xlsx`);
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
    downloadExcel,
  };
});

function downloadBlob(blob: Blob, filename: string = "applications_export.csv"): void {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

function cleanFilters(filters: Filters = {}) {
  return Object.fromEntries(
    Object.entries(filters).filter(([_, value]) => {
      if (value === "" || value === null || value === undefined) return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    }),
  );
}
