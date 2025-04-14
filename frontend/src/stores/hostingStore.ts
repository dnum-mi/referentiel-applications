import { defineStore } from "pinia";
import { ref } from "vue";
import type { Hosting } from "@/models/Hosting";
import { call } from "@/api/callService";
import useToaster from "@/composables/use-toaster";

export const useHostingStore = defineStore("hostingStore", () => {
  const hostings = ref<Hosting[]>([]);
  const isLoading = ref(false);
  const toaster = useToaster();

  const fetchHostings = async (applicationId: string) => {
    try {
      isLoading.value = true;
      const result = await call("hosting", "getByApplication", { applicationId });
      hostings.value = result;
    } catch {
      toaster.addErrorMessage("Erreur lors de la récupération des hébergements");
    } finally {
      isLoading.value = false;
    }
  };

  const createHosting = async (applicationId: string, hosting: Hosting) => {
    const newHosting = await call("hosting", "create", { ...hosting, applicationId });
    hostings.value.push(newHosting);
    toaster.addSuccessMessage("Hébergement créé avec succès");
    return newHosting;
  };

  const updateHosting = async (applicationId: string, hosting: Hosting) => {
    const updatedHosting = await call("hosting", "update", { ...hosting, applicationId, hostingId: hosting.id });
    const index = hostings.value.findIndex((h) => h.id === hosting.id);
    if (index !== -1) hostings.value[index] = updatedHosting;
    toaster.addSuccessMessage("Hébergement mis à jour avec succès");
    return updatedHosting;
  };

  const deleteHosting = async (applicationId: string, hostingId: string) => {
    await call("hosting", "delete", { applicationId, hostingId });
    hostings.value = hostings.value.filter((h) => h.id !== hostingId);
    toaster.addSuccessMessage("Hébergement supprimé avec succès");
  };

  return {
    hostings,
    isLoading,
    fetchHostings,
    createHosting,
    updateHosting,
    deleteHosting,
  };
});
