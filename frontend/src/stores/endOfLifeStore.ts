import { isApiSuccess } from "@/api/api-result";
import type { EndOfLifeApplicationDto, EndOfLifeControllerFindEndOfLifeApplicationsData } from "@/client/types.gen";
import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import api from "@/api/index";
import { useToasterStore } from "@/stores/toasterStore";
import { useUserStore } from "@/stores/userStore";
import { Permission } from "@/client/types.gen";
import { downloadBlob } from "@/utils/download-blob";

export type EndOfLifeQuery = NonNullable<EndOfLifeControllerFindEndOfLifeApplicationsData["query"]>;

/** Vue transverse des fins de vie (#2236). */
export const useEndOfLifeStore = defineStore("endOfLifeStore", () => {
  const applications = ref<EndOfLifeApplicationDto[]>([]);
  const total = ref(0);
  const isLoading = ref(false);
  const isExporting = ref(false);
  const toaster = useToasterStore();
  const userStore = useUserStore();
  let requestSequence = 0;
  let exportSequence = 0;
  const canExport = computed(() => userStore.canListTechnologies && userStore.hasPermissions([Permission.DATA_EXPORT]));

  // #2801 : le cache appartient à une identité et à son périmètre de consultation.
  // Le vider immédiatement empêche une réponse de l'ancien contexte de le repeupler.
  const accessContext = computed(() =>
    JSON.stringify([
      userStore.user?.id,
      userStore.user?.role,
      userStore.user?.scopeOrganizationId,
      userStore.user?.scopeOrganization?.path,
      userStore.canListTechnologies,
    ]),
  );

  function resetApplications() {
    requestSequence++;
    applications.value = [];
    total.value = 0;
    isLoading.value = false;
  }

  watch(accessContext, resetApplications, { flush: "sync" });
  watch(
    () => [accessContext.value, canExport.value],
    () => {
      exportSequence++;
      isExporting.value = false;
    },
    { flush: "sync" },
  );

  async function fetchApplications(query: EndOfLifeQuery = { status: "all" }) {
    resetApplications();
    if (!userStore.canListTechnologies) return;

    const request = requestSequence;
    const isCurrentRequest = () => request === requestSequence && userStore.canListTechnologies;
    isLoading.value = true;
    try {
      const response = await api.endOfLifeControllerFindEndOfLifeApplications({ query });
      if (!isCurrentRequest()) return;
      if (!isApiSuccess(response)) {
        toaster.addErrorMessage("Erreur lors de la récupération des fins de vie.");
        console.error("Error fetching end-of-life applications:", response.error);
        return;
      }
      applications.value = response.data?.results ?? [];
      total.value = response.data?.total ?? 0;
    } catch {
      if (isCurrentRequest()) toaster.addErrorMessage("Erreur lors de la récupération des fins de vie.");
    } finally {
      // `finally` et non une remise à zéro en fin de bloc : sur une erreur
      // réseau, le spinner resterait sinon bloqué (cf. #2248).
      if (isCurrentRequest()) isLoading.value = false;
    }
  }

  async function downloadExcel(query: EndOfLifeQuery = { status: "all" }) {
    if (!canExport.value || isExporting.value) return;
    const request = ++exportSequence;
    const isCurrentRequest = () => request === exportSequence && canExport.value;
    isExporting.value = true;
    try {
      // L'export porte sur toutes les pages, avec les filtres et le tri affichés.
      const { page: _page, pageSize: _pageSize, ...exportQuery } = query;
      const response = await api.endOfLifeControllerExportEndOfLifeApplications({ query: exportQuery, parseAs: "blob" });
      if (!isCurrentRequest()) return;
      if (!isApiSuccess(response) || !response.data) {
        throw new Error("Erreur lors de l'export Excel des technologies.");
      }
      const blob = new Blob([response.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const date = new Date().toISOString().split("T")[0];
      downloadBlob(blob, `technologies_export_${date}.xlsx`);
    } catch (error) {
      if (isCurrentRequest()) throw error;
    } finally {
      if (isCurrentRequest()) isExporting.value = false;
    }
  }

  return { applications, total, isLoading, isExporting, canExport, fetchApplications, downloadExcel, accessContext };
});
